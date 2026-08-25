import httpx

from app.ai.base import AIProvider
from app.core.config import settings
from app.core.errors import AppError


class GeminiProvider(AIProvider):
    def generate(self, prompt: str) -> str:
        if not settings.gemini_api_key:
            raise AppError(503, "AI_NOT_CONFIGURED", "Gemini is not configured for this environment")
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_model}:generateContent"
        )
        try:
            response = httpx.post(
                url,
                params={"key": settings.gemini_api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1200},
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError) as exc:
            raise AppError(502, "AI_PROVIDER_ERROR", "Gemini could not complete the request") from exc

