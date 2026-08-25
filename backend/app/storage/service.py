from functools import lru_cache

from app.core.config import settings
from app.storage.base import FileStorage
from app.storage.local import LocalFileStorage
from app.storage.s3 import S3FileStorage


@lru_cache
def get_storage() -> FileStorage:
    if settings.file_storage_provider == "local":
        return LocalFileStorage(settings.upload_dir)
    if settings.file_storage_provider in {"s3", "b2", "r2"}:
        return S3FileStorage(
            bucket=settings.s3_bucket,
            endpoint_url=settings.s3_endpoint_url,
            region=settings.s3_region,
            access_key_id=settings.s3_access_key_id,
            secret_access_key=settings.s3_secret_access_key,
            prefix=settings.s3_prefix,
        )
    raise ValueError(f"Unsupported file storage provider: {settings.file_storage_provider}")

