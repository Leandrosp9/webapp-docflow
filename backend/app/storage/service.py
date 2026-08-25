from functools import lru_cache

from app.core.config import settings
from app.storage.base import FileStorage
from app.storage.local import LocalFileStorage


@lru_cache
def get_storage() -> FileStorage:
    return LocalFileStorage(settings.upload_dir)

