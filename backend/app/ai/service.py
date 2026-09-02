from functools import lru_cache

from app.ai.base import AIProvider
from app.ai.providers.gemini import GeminiProvider
from app.core.errors import AppError


class AIService:
    def __init__(self, provider: AIProvider):
        self.provider = provider

    def review(self, title: str, content: str) -> str:
        return self.provider.generate(
            "Revise este documento empresarial. Responda sempre em português do Brasil, em "
            "Markdown conciso, com exatamente estas seções: Resumo, Problemas encontrados, "
            "Pontos confusos, Sugestões de melhoria e Riscos de ambiguidade. Não reescreva o "
            f"documento automaticamente.\n\nTítulo: {title}\n\n{content}"
        )

    def summarize(self, title: str, content: str) -> str:
        return self.provider.generate(
            "Escreva um resumo empresarial objetivo, sempre em português do Brasil e com no "
            "máximo 120 palavras. Não invente fatos."
            f"\n\nTítulo: {title}\n\n{content}"
        )

    def compare(self, title: str, old: str, new: str, raw_diff: list[str]) -> str:
        formatted_diff = "\n".join(raw_diff)
        return self.provider.generate(
            "Explique as diferenças entre duas versões de um documento empresarial. Responda "
            "sempre em português do Brasil e use estas seções concisas em Markdown: Adicionado, "
            "Removido, Alterado e Impacto provável. Baseie a resposta somente nos textos e no "
            f"diff fornecidos.\n\nTítulo: {title}\n\nANTERIOR:\n{old}\n\nNOVA:\n{new}"
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
