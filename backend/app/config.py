import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized application settings loaded from .env file."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Groq LLM
    GROQ_API_KEY: str = ""

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-southeast-2"
    AWS_S3_BUCKET_NAME: str = "agentverse-interview-data-hari"

    # AWS DynamoDB
    DYNAMODB_USERS_TABLE: str = "agentverse-users"
    DYNAMODB_SCORECARDS_TABLE: str = "agentverse-scorecards"

    # JWT Auth
    JWT_SECRET: str = "agentverse-dev-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 h

    # App meta
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"

    @property
    def groq_configured(self) -> bool:
        return bool(self.GROQ_API_KEY)

    @property
    def aws_configured(self) -> bool:
        return bool(self.AWS_ACCESS_KEY_ID and self.AWS_SECRET_ACCESS_KEY)


# Singleton
settings = Settings()
