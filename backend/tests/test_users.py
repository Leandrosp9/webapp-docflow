from app.core.enums import UserRole
from app.core.security import verify_password
from app.models.entities import User


def user_payload(**overrides):
    return {
        "name": "Carla Dias",
        "email": "carla@docflow.demo",
        "cpf": "529.982.247-25",
        "password": "SenhaSegura2026!",
        "role": "COLLABORATOR",
        **overrides,
    }


def test_admin_creates_user_with_normalized_cpf(client, admin_headers, db):
    response = client.post("/api/v1/users", json=user_payload(), headers=admin_headers)

    assert response.status_code == 201, response.text
    assert response.json()["cpf"] == "52998224725"
    created = db.get(User, response.json()["id"])
    assert verify_password("SenhaSegura2026!", created.password_hash)


def test_create_user_rejects_invalid_or_duplicate_cpf(client, admin_headers):
    invalid = client.post(
        "/api/v1/users",
        json=user_payload(email="invalido@docflow.demo", cpf="111.111.111-11"),
        headers=admin_headers,
    )
    assert invalid.status_code == 422

    first = client.post("/api/v1/users", json=user_payload(), headers=admin_headers)
    duplicate = client.post(
        "/api/v1/users",
        json=user_payload(email="outra@docflow.demo"),
        headers=admin_headers,
    )
    assert first.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "CPF_ALREADY_EXISTS"


def test_admin_updates_user_and_changes_password(client, admin_headers, db):
    created = client.post("/api/v1/users", json=user_payload(), headers=admin_headers).json()
    response = client.patch(
        f"/api/v1/users/{created['id']}",
        json={
            "name": "Carla Monteiro",
            "cpf": "168.995.350-09",
            "password": "NovaSenha2026!",
            "role": "ADMIN",
        },
        headers=admin_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Carla Monteiro"
    assert response.json()["cpf"] == "16899535009"
    assert response.json()["role"] == UserRole.ADMIN.value
    updated = db.get(User, created["id"])
    assert verify_password("NovaSenha2026!", updated.password_hash)
    assert not verify_password("SenhaSegura2026!", updated.password_hash)


def test_deactivation_revokes_access_and_can_be_reversed(client, admin_headers):
    created = client.post("/api/v1/users", json=user_payload(), headers=admin_headers).json()
    login = client.post(
        "/api/v1/auth/login",
        json={"email": created["email"], "password": "SenhaSegura2026!"},
    ).json()
    user_headers = {"Authorization": f"Bearer {login['access_token']}"}

    inactive = client.patch(
        f"/api/v1/users/{created['id']}",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert inactive.status_code == 200
    assert inactive.json()["is_active"] is False
    assert client.get("/api/v1/auth/me", headers=user_headers).status_code == 401
    assert client.post(
        "/api/v1/auth/refresh", json={"refresh_token": login["refresh_token"]}
    ).status_code == 401

    active = client.patch(
        f"/api/v1/users/{created['id']}",
        json={"is_active": True},
        headers=admin_headers,
    )
    assert active.status_code == 200
    assert active.json()["is_active"] is True


def test_admin_cannot_remove_own_access(client, admin_headers, seeded):
    deactivate = client.patch(
        f"/api/v1/users/{seeded['admin'].id}",
        json={"is_active": False},
        headers=admin_headers,
    )
    demote = client.patch(
        f"/api/v1/users/{seeded['admin'].id}",
        json={"role": "COLLABORATOR"},
        headers=admin_headers,
    )
    delete = client.delete(f"/api/v1/users/{seeded['admin'].id}", headers=admin_headers)

    assert deactivate.status_code == 409
    assert demote.status_code == 409
    assert delete.status_code == 409


def test_delete_unused_user_and_isolate_tenant(client, admin_headers, seeded, db):
    created = client.post("/api/v1/users", json=user_payload(), headers=admin_headers).json()
    deleted = client.delete(f"/api/v1/users/{created['id']}", headers=admin_headers)
    assert deleted.status_code == 200
    assert db.get(User, created["id"]) is None

    foreign = client.delete(
        f"/api/v1/users/{seeded['other_admin'].id}", headers=admin_headers
    )
    assert foreign.status_code == 404


def test_user_with_document_history_must_be_deactivated(
    client, admin_headers, seeded, create_document
):
    create_document(assigned_reviewer_id=seeded["collaborator"].id)
    response = client.delete(
        f"/api/v1/users/{seeded['collaborator'].id}", headers=admin_headers
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "USER_HAS_DOCUMENT_HISTORY"
