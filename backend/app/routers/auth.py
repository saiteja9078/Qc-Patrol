from collections import defaultdict
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, VerifyEmailRequest, LoginRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    ChangePasswordRequest, TokenResponse, UserResponse,
)
from app.services.auth_service import (
    hash_password, verify_password, generate_otp,
    create_access_token, create_refresh_token, decode_token,
    get_user_by_email, get_user_by_id,
    create_otp_token, get_valid_otp, verify_otp,
)
from app.services.email_service import send_otp_email
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

# In-memory rate limit for forgot-password: {email: [timestamps]}
_forgot_password_requests: dict[str, list[datetime]] = defaultdict(list)

REFRESH_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/auth")


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, body.email)
    if existing:
        # Generic error to avoid email enumeration
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please try again.",
        )

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        is_active=False,
    )
    db.add(user)
    await db.flush()

    otp = generate_otp()
    await create_otp_token(db, user.id, otp, "email_verify")
    await db.commit()

    # Send OTP email (do NOT await in prod to avoid blocking — kept sync for simplicity)
    try:
        await send_otp_email(body.email, otp, "email_verify")
    except Exception:
        pass  # Don't fail registration if email fails

    return {"message": "Registration successful. Check your email for the verification code."}


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, body.email)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification attempt.")

    otp_record = await get_valid_otp(db, user.id, "email_verify")
    if not otp_record or not verify_otp(body.otp, otp_record.token_hash):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    otp_record.used = True
    user.is_active = True
    await db.commit()

    return {"message": "Email verified. You can now log in."}


@router.post("/login")
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account not activated. Check your email.")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=access_token)


@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token.")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    user_id = payload.get("sub")
    user = await get_user_by_id(db, UUID(user_id))
    if not user or not user.is_active:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="User not found.")

    # Rotate tokens
    new_access = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    _set_refresh_cookie(response, new_refresh)

    return TokenResponse(access_token=new_access)


@router.post("/logout")
async def logout(response: Response):
    _clear_refresh_cookie(response)
    return {"message": "Logged out."}


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    # Rate limiting: max 3 per email per hour
    now = datetime.now(timezone.utc)
    recent = [
        t for t in _forgot_password_requests[body.email]
        if now - t < timedelta(hours=1)
    ]
    _forgot_password_requests[body.email] = recent
    if len(recent) >= 3:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
        )
    _forgot_password_requests[body.email].append(now)

    # Always return success to avoid email enumeration
    user = await get_user_by_email(db, body.email)
    if user and user.is_active:
        otp = generate_otp()
        await create_otp_token(db, user.id, otp, "password_reset")
        await db.commit()
        try:
            await send_otp_email(body.email, otp, "password_reset")
        except Exception:
            pass

    return {"message": "If that email exists, a reset code has been sent."}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_email(db, body.email)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset attempt.")

    otp_record = await get_valid_otp(db, user.id, "password_reset")
    if not otp_record or not verify_otp(body.otp, otp_record.token_hash):
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")

    otp_record.used = True
    user.password_hash = hash_password(body.new_password)
    await db.commit()

    return {"message": "Password reset successful. You can now log in."}


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"message": "Password changed successfully."}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
