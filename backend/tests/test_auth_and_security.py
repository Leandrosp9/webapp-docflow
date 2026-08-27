from app.models.entities import Document, DocumentVersion


def test_login_refresh_and_logout(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@docflow.demo", "password": "DocFlowDemo2026!"},
    )
    assert response.status_code == 200
    tokens = response.json()
    assert tokens["token_type"] == "bearer"
    assert tokens["user"]["role"] == "ADMIN"

    refreshed = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert refreshed.status_code == 200
    assert refreshed.json()["refresh_token"] != tokens["refresh_token"]

    logout = client.post(
        "/api/v1/auth/logout", json={"refresh_token": refreshed.json()["refresh_token"]}
    )
    assert logout.status_code == 200


def test_invalid_login_has_standard_error(client):
    response = client.post(
        "/api/v1/auth/login", json={"email": "admin@docflow.demo", "password": "wrong-pass"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert response.json()["error"]["request_id"]


def test_rbac_blocks_collaborator_from_creating_user(client, collaborator_headers):
    response = client.post(
        "/api/v1/users",
        json={
            "name": "Carla Dias",
            "email": "carla@docflow.demo",
            "cpf": "529.982.247-25",
            "password": "SecurePassword2026!",
            "role": "COLLABORATOR",
        },
        headers=collaborator_headers,
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_tenant_isolation_returns_not_found(client, db, seeded, admin_headers):
    foreign = Document(
        company_id=seeded["other_company"].id,
        title="Plano Estratégico Orbit",
        description="Confidential plan",
        category="Strategy",
        created_by=seeded["other_admin"].id,
    )
    db.add(foreign)
    db.flush()
    version = DocumentVersion(
        document_id=foreign.id,
        version_number=1,
        content="Confidential foreign tenant content",
        created_by=seeded["other_admin"].id,
        change_summary="Initial version",
    )
    db.add(version)
    db.commit()

    response = client.get(f"/api/v1/documents/{foreign.id}", headers=admin_headers)
    assert response.status_code == 404
    listing = client.get("/api/v1/documents", headers=admin_headers).json()
    assert all(item["id"] != foreign.id for item in listing["items"])

    requests = [
        ("get", f"/api/v1/documents/{foreign.id}/comments", None),
        ("get", f"/api/v1/documents/{foreign.id}/history", None),
        ("post", f"/api/v1/documents/{foreign.id}/submit", None),
        (
            "post",
            f"/api/v1/documents/{foreign.id}/versions",
            {"content": "Tentativa de invasão", "change_summary": "Versão indevida"},
        ),
        (
            "post",
            f"/api/v1/documents/{foreign.id}/compare",
            {
                "from_version_id": version.id,
                "to_version_id": version.id,
                "explain_with_ai": False,
            },
        ),
        ("get", f"/api/v1/documents/{foreign.id}/versions/{version.id}/file", None),
    ]
    for method, path, payload in requests:
        result = client.request(method, path, json=payload, headers=admin_headers)
        assert result.status_code == 404, f"{method.upper()} {path}: {result.text}"


def test_reviewer_must_belong_to_authenticated_tenant(client, admin_headers, seeded):
    response = client.post(
        "/api/v1/documents",
        json={
            "title": "Documento com revisor externo",
            "description": "A atribuição deve ser rejeitada.",
            "category": "Compliance",
            "document_type": "TEXT",
            "content": "Conteúdo interno.",
            "assigned_reviewer_id": seeded["other_admin"].id,
            "change_summary": "Versão inicial",
        },
        headers=admin_headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_REVIEWER"
