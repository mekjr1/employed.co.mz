from __future__ import annotations

from app.models.payment_intent import PaymentIntent
from app.payments.settlement import settle_intent
from tests.conftest import utcnow


def test_initiate_stripe_payment_returns_redirect_kind(client, sample_job, test_user, auth_headers, sample_market_headers):
    job = sample_job(user=test_user)

    response = client.post(
        "/payments/initiate",
        json={"job_id": job.id, "provider_key": "stripe"},
        headers=auth_headers(test_user) | sample_market_headers("mz"),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["provider_key"] == "stripe"
    assert body["kind"] == "redirect"


def test_initiate_mpesa_payment_returns_await_kind(client, sample_job, test_user, auth_headers, sample_market_headers):
    job = sample_job(user=test_user)

    response = client.post(
        "/payments/initiate",
        json={"job_id": job.id, "provider_key": "mpesa", "payer_msisdn": "258840000000"},
        headers=auth_headers(test_user) | sample_market_headers("mz"),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["provider_key"] == "mpesa"
    assert body["kind"] == "await"
    assert body["provider_ref"].startswith("pending-")


def test_initiate_payment_reuses_existing_open_intent(
    client,
    payment_intent_factory,
    sample_job,
    test_user,
    auth_headers,
    sample_market_headers,
    db_session,
):
    job = sample_job(user=test_user)
    existing = payment_intent_factory(job=job, user=test_user, provider_key="mpesa", status="awaiting_user", provider_ref="pending-existing")

    response = client.post(
        "/payments/initiate",
        json={"job_id": job.id, "provider_key": "mpesa", "payer_msisdn": "258840000000"},
        headers=auth_headers(test_user) | sample_market_headers("mz"),
    )

    assert response.status_code == 201
    assert response.json()["intent_id"] == str(existing.id)
    assert response.json()["provider_ref"] == "pending-existing"
    assert db_session.query(PaymentIntent).count() == 1


def test_initiate_emola_payment_returns_await_kind(client, sample_job, test_user, auth_headers, sample_market_headers):
    job = sample_job(user=test_user)

    response = client.post(
        "/payments/initiate",
        json={"job_id": job.id, "provider_key": "emola", "payer_msisdn": "258850000000"},
        headers=auth_headers(test_user) | sample_market_headers("mz"),
    )

    assert response.status_code == 201
    assert response.json()["provider_key"] == "emola"


def test_initiate_payment_rejects_provider_not_available_for_market(client, sample_job, test_user, auth_headers, sample_market_headers):
    job = sample_job(user=test_user, country="Mexico")

    response = client.post(
        "/payments/initiate",
        json={"job_id": job.id, "provider_key": "mpesa", "payer_msisdn": "258840000000"},
        headers=auth_headers(test_user) | sample_market_headers("mx"),
    )

    assert response.status_code == 400


def test_poll_payment_status_returns_current_status(client, payment_intent_factory, sample_job, test_user, auth_headers):
    job = sample_job(user=test_user)
    intent = payment_intent_factory(job=job, user=test_user, status="awaiting_user", provider_key="mpesa")

    response = client.get(f"/payments/{intent.id}/status", headers=auth_headers(test_user))

    assert response.status_code == 200
    assert response.json()["status"] == "awaiting_user"


def test_cancel_pending_payment_marks_cancelled(client, payment_intent_factory, sample_job, test_user, auth_headers):
    job = sample_job(user=test_user)
    intent = payment_intent_factory(job=job, user=test_user, status="pending")

    response = client.post(f"/payments/{intent.id}/cancel", headers=auth_headers(test_user))

    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


def test_cancel_completed_payment_is_noop(client, payment_intent_factory, sample_job, test_user, auth_headers):
    job = sample_job(user=test_user)
    intent = payment_intent_factory(job=job, user=test_user, status="completed", settled_at=utcnow())

    response = client.post(f"/payments/{intent.id}/cancel", headers=auth_headers(test_user))

    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_settlement_marks_intent_completed_and_extends_job_featured_through(db_session, payment_intent_factory, sample_job, test_user):
    job = sample_job(user=test_user, featured=False)
    intent = payment_intent_factory(job=job, user=test_user, status="pending", extended_through=utcnow())
    new_through = utcnow().replace(microsecond=0)
    intent.extended_through = new_through
    db_session.commit()

    settled = __import__("asyncio").run(settle_intent(db_session, intent.id, provider_ref="checkout-session-1"))
    db_session.refresh(job)

    assert settled is not None
    assert settled.status == "completed"
    assert job.featured_through == new_through
    assert job.featured_charge_history[-1]["provider_ref"] == "checkout-session-1"
