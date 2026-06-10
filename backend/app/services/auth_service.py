import random
import string
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import User
from app.models.otp import OtpToken

settings = get_settings()

# bcrypt cost factor — used directly via the bcrypt library (passlib 1.7.4
# is incompatible with bcrypt 4+ due to its internal detect_wrap_bug() test)
_BCRYPT_ROUNDS = 12


def _to_bytes(value: str) -> bytes:
    """Encode to UTF-8 and truncate to bcrypt's 72-byte hard limit."""
    return value.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_to_bytes(password), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_to_bytes(plain), hashed.encode("utf-8"))


def generate_otp() -> str:
    """Generate a 6-digit numeric OTP."""
    return "".join(random.choices(string.digits, k=6))


def hash_otp(otp: str) -> str:
    """Hash OTP with bcrypt before storing. OTPs are always <72 bytes."""
    return bcrypt.hashpw(_to_bytes(otp), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("utf-8")


def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    return bcrypt.checkpw(_to_bytes(plain_otp), hashed_otp.encode("utf-8"))


def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload["exp"] = expire
    payload["type"] = "access"
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload["exp"] = expire
    payload["type"] = "refresh"
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_otp_token(
    db: AsyncSession, user_id: UUID, otp: str, purpose: str
) -> OtpToken:
    """Hash the OTP and store it. Never store raw OTP."""
    token = OtpToken(
        user_id=user_id,
        token_hash=hash_otp(otp),
        purpose=purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(token)
    await db.flush()
    return token


async def get_valid_otp(
    db: AsyncSession, user_id: UUID, purpose: str
) -> OtpToken | None:
    """Get the most recent unused, unexpired OTP for the user."""
    result = await db.execute(
        select(OtpToken)
        .where(
            OtpToken.user_id == user_id,
            OtpToken.purpose == purpose,
            OtpToken.used == False,
            OtpToken.expires_at > datetime.now(timezone.utc),
        )
        .order_by(OtpToken.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
