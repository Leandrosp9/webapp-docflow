from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DocFlow API"
    environment: str = "development"
    database_url: str = "sqlite:///./docflow.db"
    jwt_secret: str = "development-only-secret-change-before-production"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cors_origins: str = "http://localhost:5173"
    max_upload_mb: int = 10
    upload_dir: str = "uploads"
    file_storage_provider: str = "local"
    s3_endpoint_url: str = ""
    s3_bucket: str = ""
    s3_region: str = "us-east-1"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_prefix: str = "docflow"
    pdf_max_pages: int = 100
    ocr_enabled: bool = True
    ocr_languages: str = "por+eng"
    ocr_dpi: int = 200
    ocr_min_native_chars: int = 40
    ocr_max_pages: int = 25
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
