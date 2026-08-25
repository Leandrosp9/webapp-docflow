from abc import ABC, abstractmethod
from typing import BinaryIO


class FileStorage(ABC):
    @abstractmethod
    def save(self, stream: BinaryIO, filename: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def open(self, path: str) -> BinaryIO:
        raise NotImplementedError

    @abstractmethod
    def delete(self, path: str) -> None:
        raise NotImplementedError
