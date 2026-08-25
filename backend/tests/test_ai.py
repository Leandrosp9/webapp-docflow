from app.ai.service import get_ai_service
from app.main import app


class FakeAIService:
    def review(self, title, content):
        return f"Review: {title} is clear"

    def summarize(self, title, content):
        return f"Summary: {title}"

    def compare(self, title, old, new, raw_diff):
        return "Impact: review cadence increased"


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
