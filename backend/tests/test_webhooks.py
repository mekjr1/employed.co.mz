from __future__ import annotations

import hashlib
import hmac
import json


class FakeStripeModule:
    class Webhook:
        @staticmethod
        def construct_event(payload, signature, secret):
            return {
                "type": "checkout.session.completed",
                "data": {"object": {"id": "cs_test_1", "metadata": {}}},
            }


def test_stripe_webhook_with_valid_signature_returns_200(client, monkeypatch):
    monkeypatch.setattr("app.webhooks.stripe_webhook._setting", lambda name, default=None: "whsec_test")
    monkeypatch.setattr("app.webhooks.stripe_webhook._stripe_module", lambda: FakeStripeModule)

    response = client.post("/_stripe/webhook", content=b"{}", headers={"stripe-signature": "sig_test"})

    assert response.status_code == 200


def test_stripe_webhook_with_invalid_signature_returns_400(client, monkeypatch):
    class BrokenStripeModule:
        class Webhook:
            @staticmethod
            def construct_event(payload, signature, secret):
                raise ValueError("bad signature")

    monkeypatch.setattr("app.webhooks.stripe_webhook._setting", lambda name, default=None: "whsec_test")
    monkeypatch.setattr("app.webhooks.stripe_webhook._stripe_module", lambda: BrokenStripeModule)

    response = client.post("/_stripe/webhook", content=b"{}", headers={"stripe-signature": "sig_bad"})

    assert response.status_code == 400


def test_stripe_checkout_session_completed_settles_intent(client, monkeypatch, payment_intent_factory, sample_job, test_user, db_session):
    job = sample_job(user=test_user, featured=False)
    intent = payment_intent_factory(job=job, user=test_user, status="pending")

    class SettlingStripeModule:
        class Webhook:
            @staticmethod
            def construct_event(payload, signature, secret):
                return {
                    "type": "checkout.session.completed",
                    "data": {"object": {"id": "cs_complete_1", "metadata": {"intentId": intent.id}}},
                }

    monkeypatch.setattr("app.webhooks.stripe_webhook._setting", lambda name, default=None: "whsec_test")
    monkeypatch.setattr("app.webhooks.stripe_webhook._stripe_module", lambda: SettlingStripeModule)

    response = client.post("/_stripe/webhook", content=b"{}", headers={"stripe-signature": "sig_ok"})
    db_session.refresh(intent)
    db_session.refresh(job)

    assert response.status_code == 200
    assert intent.status == "completed"
    assert job.featured_through == intent.extended_through


def test_mpesa_callback_with_valid_hmac_returns_200(client, monkeypatch, payment_intent_factory, sample_job, test_user):
    secret = "mpesa-secret"
    job = sample_job(user=test_user)
    intent = payment_intent_factory(job=job, user=test_user, provider_key="mpesa", status="awaiting_user", provider_ref="ref-123")
    payload = {"provider_ref": intent.provider_ref, "status": "successful"}
    raw = json.dumps(payload).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()

    monkeypatch.setattr("app.webhooks.mobile_money._setting", lambda name, default=None: secret)

    response = client.post("/_mpesa/callback", content=raw, headers={"x-mpesa-signature": signature})

    assert response.status_code == 200
    assert response.json()["updated"] is True


def test_mpesa_callback_with_invalid_hmac_returns_400(client, monkeypatch):
    monkeypatch.setattr("app.webhooks.mobile_money._setting", lambda name, default=None: "mpesa-secret")

    response = client.post(
        "/_mpesa/callback",
        content=b'{"provider_ref": "ref-1", "status": "successful"}',
        headers={"x-mpesa-signature": "bad-signature"},
    )

    assert response.status_code == 400
