from functools import lru_cache

from app.ai.base import AIProvider
from app.ai.providers.gemini import GeminiProvider


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


@lru_cache
def get_ai_service() -> AIService:
    return AIService(GeminiProvider())
