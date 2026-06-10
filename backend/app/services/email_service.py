from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.config import get_settings

settings = get_settings()

conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER,
    MAIL_PASSWORD=settings.SMTP_PASSWORD,
    MAIL_FROM=settings.EMAIL_FROM,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_FROM_NAME=settings.EMAIL_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)

fm = FastMail(conf)


async def send_otp_email(to_email: str, otp: str, purpose: str) -> None:
    """Send OTP email for email verification or password reset."""
    if purpose == "email_verify":
        subject = "【QCパトロール】メールアドレス確認コード"
        body = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
          <h2 style="color: #2563EB;">QC パトロール記録システム</h2>
          <p>メールアドレスの確認コードは以下の通りです：</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; 
                      color: #1E293B; background: #F1F5F9; padding: 16px 24px;
                      border-radius: 8px; text-align: center; margin: 16px 0;">
            {otp}
          </div>
          <p style="color: #64748B;">このコードは10分間有効です。他人には教えないでください。</p>
        </div>
        """
    else:
        subject = "【QCパトロール】パスワードリセットコード"
        body = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
          <h2 style="color: #2563EB;">QC パトロール記録システム</h2>
          <p>パスワードリセットコードは以下の通りです：</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                      color: #1E293B; background: #F1F5F9; padding: 16px 24px;
                      border-radius: 8px; text-align: center; margin: 16px 0;">
            {otp}
          </div>
          <p style="color: #64748B;">このコードは10分間有効です。心当たりがない場合は無視してください。</p>
        </div>
        """

    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)
