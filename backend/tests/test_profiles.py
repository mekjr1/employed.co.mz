from __future__ import annotations


PROFILE_PAYLOAD = {
    "name": "Regular User",
    "type": "Individual",
    "title": "Engineer",
    "location": "Maputo",
    "description": "Building distributed systems",
    "available_for_hire": True,
    "interested_in": ["Full Time", "Contract"],
    "contact": "profile@example.com",
    "url": "https://example.com",
}


def test_create_profile_returns_201(client, test_user, auth_headers):
    response = client.post("/profiles", json=PROFILE_PAYLOAD, headers=auth_headers(test_user))

    assert response.status_code == 201
    assert response.json()["user_id"] == test_user.id


def test_get_profile_by_user_id_returns_200(client, test_user, profile_factory):
    profile_factory(user=test_user, status="active")

    response = client.get(f"/profiles/{test_user.id}")

    assert response.status_code == 200
    assert response.json()["user_id"] == test_user.id


def test_update_own_profile_returns_200(client, test_user, auth_headers, profile_factory):
    profile_factory(user=test_user, status="active")

    response = client.put("/profiles", json={"title": "Lead Engineer"}, headers=auth_headers(test_user))

    assert response.status_code == 200
    assert response.json()["title"] == "Lead Engineer"


def test_second_profile_submission_updates_existing_profile(client, test_user, auth_headers):
    first = client.post("/profiles", json=PROFILE_PAYLOAD, headers=auth_headers(test_user))
    second = client.post(
        "/profiles", json={**PROFILE_PAYLOAD, "title": "Updated Title"}, headers=auth_headers(test_user)
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert second.json()["id"] == first.json()["id"]
    assert second.json()["title"] == "Updated Title"


def test_profile_requires_auth_for_create(client):
    response = client.post("/profiles", json=PROFILE_PAYLOAD)

    assert response.status_code == 401
