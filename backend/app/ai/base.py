from abc import ABC, abstractmethod


class AIProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def generate_with_audio(self, prompt: str, audio: bytes, mime_type: str) -> str:
        raise NotImplementedError
