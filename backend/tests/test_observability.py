from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app, settings


def test_health_echoes_forwarded_request_id(client):
    response = client.get("/health", headers={"Host": "mz.employed.co.mz", "X-Request-ID": "req-123"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "req-123"
    assert response.json()["db"] == "ok"


def test_health_accepts_head_for_uptimerobot(client):
    # Regression: DEC-0002 — UptimeRobot HTTP monitors default to HEAD, so
    # answering HEAD with 405 made every monitor read "down" even when the
    # service was healthy. /health must accept HEAD with the same status code.
    response = client.head("/health", headers={"Host": "mz.employed.co.mz"})
    assert response.status_code == 200


def test_validation_errors_are_sanitized(client, test_admin, auth_headers):
    response = client.patch(
        "/admin/jobs/bulk-status",
        json={"job_ids": [str(index) for index in range(201)], "status": "active"},
        headers=auth_headers(test_admin),
    )

    assert response.status_code == 422
    assert response.json()["detail"]
    assert all("input" not in error for error in response.json()["detail"])
    assert all("url" not in error for error in response.json()["detail"])


def test_production_500_response_is_sanitized(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "debug", False)
    app = create_app()

    @app.get("/_boom")
    async def boom() -> None:
        raise RuntimeError("sensitive failure")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/_boom", headers={"Host": "mz.employed.co.mz"})

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert response.headers["x-request-id"]
