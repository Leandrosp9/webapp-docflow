from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DocFlow API"
    environment: str = "development"
    database_url: str = "sqlite:///./docflow.db"
    jwt_secret: str = "development-only-secret-change-before-production"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cors_origins: list[str] = ["http://localhost:5173"]
    max_upload_mb: int = 10
    upload_dir: str = "uploads"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
