from app.main import app
from app.models.entities import Document
from app.storage.base import FileStorage
from app.storage.service import get_storage


class FailingStorage(FileStorage):
    def save(self, stream, filename):
        raise OSError("storage offline")

    def open(self, path):
        raise FileNotFoundError(path)

    def delete(self, path):
        return None


def test_required_text_fields_reject_whitespace(client, admin_headers, create_document):
    blank_document = client.post(
        "/api/v1/documents",
        json={
            "title": "   ",
            "category": "  ",
            "document_type": "TEXT",
            "content": "Conteúdo válido",
            "change_summary": "   ",
        },
        headers=admin_headers,
    )
    assert blank_document.status_code == 422

    document = create_document()
    blank_version = client.post(
        f"/api/v1/documents/{document['id']}/versions",
        json={"content": "   ", "change_summary": "   "},
        headers=admin_headers,
    )
    assert blank_version.status_code == 422

    client.post(f"/api/v1/documents/{document['id']}/submit", headers=admin_headers)
    blank_comment = client.post(
        f"/api/v1/documents/{document['id']}/comments",
        json={"message": "   "},
        headers=admin_headers,
    )
    assert blank_comment.status_code == 422


def test_user_name_rejects_whitespace(client, admin_headers):
    response = client.post(
        "/api/v1/users",
        json={
            "name": "   ",
            "email": "sem-nome@docflow.demo",
            "cpf": "529.982.247-25",
            "password": "SecurePassword2026!",
            "role": "COLLABORATOR",
        },
        headers=admin_headers,
    )
    assert response.status_code == 422


def test_pdf_creation_rolls_back_when_storage_fails(client, db, admin_headers, seeded):
    app.dependency_overrides[get_storage] = lambda: FailingStorage()
    try:
        response = client.post(
            "/api/v1/documents/upload",
            data={
                "title": "Política sem arquivo órfão",
                "description": "Validação transacional do armazenamento.",
                "category": "Segurança",
                "assigned_reviewer_id": seeded["collaborator"].id,
                "change_summary": "Versão inicial",
            },
            files={"file": ("politica.pdf", b"%PDF-1.4\n%%EOF", "application/pdf")},
            headers=admin_headers,
        )
    finally:
        app.dependency_overrides.pop(get_storage, None)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "FILE_STORAGE_UNAVAILABLE"
    assert db.query(Document).filter_by(title="Política sem arquivo órfão").count() == 0


def test_pdf_version_rejects_blank_summary_and_storage_failure(
    client, admin_headers, seeded
):
    minimal_pdf = b"%PDF-1.4\n%%EOF"
    created = client.post(
        "/api/v1/documents/upload",
        data={
            "title": "Procedimento PDF versionado",
            "description": "Documento para validar uma nova versão.",
            "category": "Operações",
            "assigned_reviewer_id": seeded["collaborator"].id,
            "change_summary": "Versão inicial",
        },
        files={"file": ("procedimento.pdf", minimal_pdf, "application/pdf")},
        headers=admin_headers,
    ).json()

    blank = client.post(
        f"/api/v1/documents/{created['id']}/versions/upload",
        data={"change_summary": "   "},
        files={"file": ("procedimento-v2.pdf", minimal_pdf, "application/pdf")},
        headers=admin_headers,
    )
    assert blank.status_code == 422

    app.dependency_overrides[get_storage] = lambda: FailingStorage()
    try:
        unavailable = client.post(
            f"/api/v1/documents/{created['id']}/versions/upload",
            data={"change_summary": "Nova versão válida"},
            files={"file": ("procedimento-v2.pdf", minimal_pdf, "application/pdf")},
            headers=admin_headers,
        )
    finally:
        app.dependency_overrides.pop(get_storage, None)

    assert unavailable.status_code == 503
    detail = client.get(f"/api/v1/documents/{created['id']}", headers=admin_headers).json()
    assert detail["current_version"] == 1
    assert len(detail["versions"]) == 1
