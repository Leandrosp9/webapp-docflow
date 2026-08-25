from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.enums import UserRole
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.entities import Company, User


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def seeded(db):
    company = Company(name="NovaTech Solutions")
    other_company = Company(name="Orbit Systems")
    db.add_all([company, other_company])
    db.flush()
    users = {
        "admin": User(
            company_id=company.id,
            name="Ana Ribeiro",
            email="admin@docflow.demo",
            password_hash=hash_password("DocFlowDemo2026!"),
            role=UserRole.ADMIN.value,
        ),
        "collaborator": User(
            company_id=company.id,
            name="Bruno Costa",
            email="collaborator@docflow.demo",
            password_hash=hash_password("DocFlowDemo2026!"),
            role=UserRole.COLLABORATOR.value,
        ),
        "other_admin": User(
            company_id=other_company.id,
            name="Marina Lima",
            email="admin@orbit.demo",
            password_hash=hash_password("OrbitDemo2026!"),
            role=UserRole.ADMIN.value,
        ),
    }
    db.add_all(users.values())
    db.commit()
    return {"company": company, "other_company": other_company, **users}


@pytest.fixture()
def client(db, seeded, tmp_path) -> Generator[TestClient, None, None]:
    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def login(client: TestClient, email="admin@docflow.demo", password="DocFlowDemo2026!"):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture()
def admin_headers(client):
    return login(client)


@pytest.fixture()
def collaborator_headers(client):
    return login(client, "collaborator@docflow.demo")


@pytest.fixture()
def create_document(client, admin_headers, seeded):
    def factory(**overrides):
        payload = {
            "title": "Política de Continuidade",
            "description": "Diretrizes para continuidade operacional.",
            "category": "Operações",
            "document_type": "TEXT",
            "content": "A continuidade operacional deve ser testada semestralmente.",
            "assigned_reviewer_id": seeded["collaborator"].id,
            "change_summary": "Versão inicial",
            **overrides,
        }
        response = client.post("/api/v1/documents", json=payload, headers=admin_headers)
        assert response.status_code == 201, response.text
        return response.json()

    return factory
