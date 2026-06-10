from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/qc_patrol"
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    EMAIL_FROM_NAME: str = "QC Patrol System"

    # Single origin (legacy). Use FRONTEND_ORIGINS for multiple (comma-separated).
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    # e.g. "https://qc-patrol.vercel.app,https://qc-patrol-xyz.vercel.app"
    FRONTEND_ORIGINS: str = ""
    APP_ENV: str = "development"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
