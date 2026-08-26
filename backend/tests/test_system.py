def test_health_and_readiness(client):
    health = client.get("/health")
    readiness = client.get("/ready")

    assert health.status_code == 200
    assert health.json()["status"] == "healthy"
    assert readiness.status_code == 200
    assert readiness.json()["status"] == "ready"


def test_api_documentation_is_available(client):
    assert client.get("/docs").status_code == 200
