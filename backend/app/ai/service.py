from functools import lru_cache

from app.ai.base import AIProvider
from app.ai.providers.gemini import GeminiProvider
from app.core.errors import AppError


class AIService:
    def __init__(self, provider: AIProvider):
        self.provider = provider

    def review(self, title: str, content: str) -> str:
        return self.provider.generate(
            "Review this business document. Respond in concise Markdown with exactly these "
            "sections: Summary, Problems found, Confusing points, Improvement suggestions, "
            f"Ambiguity risks. Never rewrite automatically.\n\nTitle: {title}\n\n{content}"
        )

    def summarize(self, title: str, content: str) -> str:
        return self.provider.generate(
            "Write an objective business summary in at most 120 words. Do not invent facts."
            f"\n\nTitle: {title}\n\n{content}"
        )

    def compare(self, title: str, old: str, new: str, raw_diff: list[str]) -> str:
        formatted_diff = "\n".join(raw_diff)
        return self.provider.generate(
            "Explain the changes between two versions of a business document. Use concise "
            "Markdown sections: Added, Removed, Changed, Probable impact. Base the answer only "
            f"on the supplied text and diff.\n\nTitle: {title}\n\nOLD:\n{old}\n\nNEW:\n{new}"
            f"\n\nDIFF:\n{formatted_diff}"
        )

    def transcribe(self, audio: bytes, mime_type: str) -> str:
        result = self.provider.generate_with_audio(
            "Transcreva este áudio em português do Brasil. Corrija pontuação, concordância e "
            "pequenos vícios de fala, preservando rigorosamente o significado e os fatos ditos. "
            "Não acrescente informações, comentários, título, Markdown ou aspas. Retorne somente "
            "o texto final corrigido.",
            audio,
            mime_type,
        ).strip()
        if not result:
            raise AppError(502, "EMPTY_TRANSCRIPTION", "Gemini returned an empty transcription")
        return result


@lru_cache
def get_ai_service() -> AIService:
    return AIService(GeminiProvider())
