def test_document_crud_and_versions(client, admin_headers, create_document):
    document = create_document()
    assert document["status"] == "DRAFT"
    assert document["version_label"] == "v1.0"

    edited = client.patch(
        f"/api/v1/documents/{document['id']}",
        json={"title": "Política de Continuidade de Negócios"},
        headers=admin_headers,
    )
    assert edited.status_code == 200
    assert edited.json()["title"] == "Política de Continuidade de Negócios"

    version = client.post(
        f"/api/v1/documents/{document['id']}/versions",
        json={
            "content": "A continuidade operacional deve ser testada trimestralmente.",
            "change_summary": "Ajuste da periodicidade de testes",
        },
        headers=admin_headers,
    )
    assert version.status_code == 201
    assert version.json()["label"] == "v1.1"

    detail = client.get(f"/api/v1/documents/{document['id']}", headers=admin_headers).json()
    assert len(detail["versions"]) == 2
    assert detail["versions"][1]["content"].endswith("semestralmente.")


def test_review_workflow_and_invalid_transition(
    client, admin_headers, collaborator_headers, create_document
):
    document = create_document()
    invalid_publish = client.post(
        f"/api/v1/documents/{document['id']}/publish", headers=admin_headers
    )
    assert invalid_publish.status_code == 409
    assert invalid_publish.json()["error"]["code"] == "INVALID_STATE_TRANSITION"

    submitted = client.post(
        f"/api/v1/documents/{document['id']}/submit", headers=admin_headers
    )
    assert submitted.status_code == 200

    approved = client.post(
        f"/api/v1/documents/{document['id']}/review",
        json={"decision": "APPROVE"},
        headers=collaborator_headers,
    )
    assert approved.status_code == 200

    published = client.post(
        f"/api/v1/documents/{document['id']}/publish", headers=admin_headers
    )
    assert published.status_code == 200
    detail = client.get(f"/api/v1/documents/{document['id']}", headers=admin_headers)
    assert detail.json()["status"] == "PUBLISHED"


def test_changes_comments_and_history(
    client, admin_headers, collaborator_headers, create_document
):
    document = create_document()
    client.post(f"/api/v1/documents/{document['id']}/submit", headers=admin_headers)
    comment = client.post(
        f"/api/v1/documents/{document['id']}/comments",
        json={"message": "Especifique o responsável pelo teste de recuperação."},
        headers=collaborator_headers,
    )
    assert comment.status_code == 201
    decision = client.post(
        f"/api/v1/documents/{document['id']}/review",
        json={
            "decision": "REQUEST_CHANGES",
            "comment": "Defina proprietário e prazo da validação.",
        },
        headers=collaborator_headers,
    )
    assert decision.status_code == 200
    history = client.get(
        f"/api/v1/documents/{document['id']}/history", headers=admin_headers
    ).json()
    actions = {item["action"] for item in history}
    assert {"DOCUMENT_CREATED", "VERSION_CREATED", "SENT_TO_REVIEW", "COMMENT_ADDED", "CHANGES_REQUESTED"} <= actions


def test_pdf_upload_validation_and_download(client, admin_headers, seeded):
    invalid = client.post(
        "/api/v1/documents/upload",
        data={
            "title": "Contrato de Prestação",
            "description": "Contrato padrão",
            "category": "Compliance",
            "assigned_reviewer_id": seeded["collaborator"].id,
        },
        files={"file": ("contract.txt", b"not a pdf", "text/plain")},
        headers=admin_headers,
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "INVALID_FILE_TYPE"

    minimal_pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
    created = client.post(
        "/api/v1/documents/upload",
        data={
            "title": "Contrato de Prestação",
            "description": "Contrato padrão",
            "category": "Compliance",
            "assigned_reviewer_id": seeded["collaborator"].id,
        },
        files={"file": ("contract.pdf", minimal_pdf, "application/pdf")},
        headers=admin_headers,
    )
    assert created.status_code == 201, created.text
    document = created.json()
    version_id = document["versions"][0]["id"]
    downloaded = client.get(
        f"/api/v1/documents/{document['id']}/versions/{version_id}/file",
        headers=admin_headers,
    )
    assert downloaded.status_code == 200
    assert downloaded.content.startswith(b"%PDF-")

