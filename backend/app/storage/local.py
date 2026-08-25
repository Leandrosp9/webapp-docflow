import shutil
import uuid
from pathlib import Path
from typing import BinaryIO

from app.storage.base import FileStorage


class LocalFileStorage(FileStorage):
    def __init__(self, root: str):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, stream: BinaryIO, filename: str) -> str:
        key = f"{uuid.uuid4()}.pdf"
        target = self.root / key
        with target.open("wb") as output:
            shutil.copyfileobj(stream, output)
        return key

    def open(self, path: str) -> BinaryIO:
        target = (self.root / path).resolve()
        if target.parent != self.root:
            raise FileNotFoundError(path)
        return target.open("rb")

    def delete(self, path: str) -> None:
        target = (self.root / path).resolve()
        if target.parent == self.root:
            target.unlink(missing_ok=True)
