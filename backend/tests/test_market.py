from __future__ import annotations


def test_mz_host_resolves_to_mz_market(client):
    response = client.get("/health", headers={"Host": "mz.employed.co.mz"})

    assert response.status_code == 200
    assert response.headers["x-market"] == "mz"


def test_mx_host_resolves_to_mx_market(client):
    response = client.get("/health", headers={"Host": "mx.employed.co.mz"})

    assert response.status_code == 200
    assert response.headers["x-market"] == "mx"


def test_unknown_host_defaults_to_mz_market(client):
    response = client.get("/health", headers={"Host": "unknown.employed.co.mz"})

    assert response.status_code == 200
    assert response.headers["x-market"] == "mz"


def test_localhost_defaults_to_mz_market(client):
    response = client.get("/health", headers={"Host": "localhost:3000"})

    assert response.status_code == 200
    assert response.headers["x-market"] == "mz"
