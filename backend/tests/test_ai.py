from app.ai.base import AIProvider
from app.ai.service import AIService, get_ai_service
from app.main import app
from app.services.audio import AudioProcessingError, get_audio_transcoder


class FakeAIService:
    def review(self, title, content):
        return f"Review: {title} is clear"

    def summarize(self, title, content):
        return f"Summary: {title}"

    def compare(self, title, old, new, raw_diff):
        return "Impact: review cadence increased"

    def transcribe(self, audio, mime_type):
        assert audio == b"RIFF-audio-normalizado"
        assert mime_type == "audio/wav"
        return "Esta é a transcrição corrigida."


class FakeAudioTranscoder:
    def to_wav(self, audio):
        assert audio == b"audio-do-navegador"
        return b"RIFF-audio-normalizado"


class FailingAudioTranscoder:
    def to_wav(self, audio):
        raise AudioProcessingError("The uploaded audio is invalid")


class CapturingProvider(AIProvider):
    def __init__(self):
        self.prompts = []

    def generate(self, prompt):
        self.prompts.append(prompt)
        return "Resposta em português."

    def generate_with_audio(self, prompt, audio, mime_type):
        self.prompts.append(prompt)
        return "Transcrição em português."


def test_ai_prompts_require_brazilian_portuguese():
    provider = CapturingProvider()
    service = AIService(provider)

    service.review("Política", "Conteúdo")
    service.summarize("Política", "Conteúdo")
    service.compare("Política", "Anterior", "Nova", ["+ alteração"])

    assert len(provider.prompts) == 3
    assert all("português do Brasil" in prompt for prompt in provider.prompts)
    assert "Problemas encontrados" in provider.prompts[0]
    assert "Impacto provável" in provider.prompts[2]


def test_ai_service_is_mocked_and_summary_is_saved(client, admin_headers, create_document):
    app.dependency_overrides[get_ai_service] = lambda: FakeAIService()
    document = create_document()
    response = client.post(
        f"/api/v1/ai/documents/{document['id']}/review", json={}, headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["result"].startswith("Review:")

    summary = client.post(
        f"/api/v1/ai/documents/{document['id']}/summary", json={}, headers=admin_headers
    )
    assert summary.status_code == 200
    detail = client.get(f"/api/v1/documents/{document['id']}", headers=admin_headers)
    assert detail.json()["ai_summary"].startswith("Summary:")
    app.dependency_overrides.pop(get_ai_service, None)


def test_audio_transcription_is_authenticated_normalized_and_mocked(client, admin_headers):
    app.dependency_overrides[get_ai_service] = lambda: FakeAIService()
    app.dependency_overrides[get_audio_transcoder] = lambda: FakeAudioTranscoder()
    try:
        response = client.post(
            "/api/v1/ai/transcribe-audio",
            files={"audio": ("gravacao.webm", b"audio-do-navegador", "audio/webm;codecs=opus")},
            headers=admin_headers,
        )
    finally:
        app.dependency_overrides.pop(get_ai_service, None)
        app.dependency_overrides.pop(get_audio_transcoder, None)

    assert response.status_code == 200, response.text
    assert response.json() == {"text": "Esta é a transcrição corrigida."}


def test_audio_transcription_rejects_invalid_input(client, admin_headers):
    invalid_type = client.post(
        "/api/v1/ai/transcribe-audio",
        files={"audio": ("gravacao.txt", b"texto", "text/plain")},
        headers=admin_headers,
    )
    empty = client.post(
        "/api/v1/ai/transcribe-audio",
        files={"audio": ("gravacao.webm", b"", "audio/webm")},
        headers=admin_headers,
    )
    app.dependency_overrides[get_audio_transcoder] = lambda: FailingAudioTranscoder()
    try:
        malformed = client.post(
            "/api/v1/ai/transcribe-audio",
            files={"audio": ("gravacao.webm", b"nao-e-audio", "audio/webm")},
            headers=admin_headers,
        )
    finally:
        app.dependency_overrides.pop(get_audio_transcoder, None)

    assert invalid_type.status_code == 422
    assert invalid_type.json()["error"]["code"] == "INVALID_AUDIO_TYPE"
    assert empty.status_code == 422
    assert empty.json()["error"]["code"] == "EMPTY_AUDIO"
    assert malformed.status_code == 422
    assert malformed.json()["error"]["code"] == "INVALID_AUDIO"


def test_audio_transcription_requires_authentication(client):
    response = client.post(
        "/api/v1/ai/transcribe-audio",
        files={"audio": ("gravacao.webm", b"audio", "audio/webm")},
    )
    assert response.status_code == 401
