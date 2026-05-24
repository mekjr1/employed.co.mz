from __future__ import annotations

import logging
import time
from typing import Any

from sqlalchemy import desc, select

from app.config import settings
from app.payments import registry
from app.payments.base import InitiateResult, PaymentProvider, StatusResult
from app.payments.settlement import coerce_pk, resolve_model, session_scope

logger = logging.getLogger(__name__)


def _setting(name: str, default=None):
    return getattr(settings, name.lower(), getattr(settings, name, default))


def _stripe_module():
    import stripe

    stripe.api_key = _setting("STRIPE_SECRET_KEY")
    return stripe


class StripeCheckoutProvider(PaymentProvider):
    key = "stripe"
    name = "Stripe"
    markets = ["mx", "mz"]
    simulator = False
    ui = {"collect": "redirect"}

    async def initiate(
        self,
        intent_id: str,
        job_id: str,
        user_id: str,
        amount: int,
        currency: str,
        payer_msisdn: str | None = None,
        return_url: str | None = None,
        cancel_url: str | None = None,
        customer_email: str | None = None,
        extended_through=None,
        **kwargs: Any,
    ) -> InitiateResult:
        if not _setting("STRIPE_SECRET_KEY"):
            raise RuntimeError("stripe-not-configured")

        stripe = _stripe_module()
        minute_bucket = int(time.time() // 60)
        idempotency_key = f"featured:{job_id}:{user_id}:{minute_bucket}"
        app_name = _setting("APP_NAME", "Employed")
        job_title = kwargs.get("job_title") or "Featured job post"
        session = stripe.checkout.Session.create(
            mode="payment",
            success_url=f"{return_url}?featured=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{cancel_url}?featured=cancel",
            customer_email=customer_email or None,
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": currency.lower(),
                        "unit_amount": amount,
                        "product_data": {
                            "name": f"{app_name} — Featured Job Post (30 days)",
                            "description": job_title,
                        },
                    },
                }
            ],
            payment_intent_data={
                "metadata": {
                    "jobId": job_id,
                    "userId": user_id,
                    "intentId": intent_id,
                }
            },
            metadata={
                "jobId": job_id,
                "userId": user_id,
                "intentId": intent_id,
                "extendedThrough": extended_through.isoformat() if extended_through else "",
                "marketKey": kwargs.get("market_key", ""),
            },
            idempotency_key=idempotency_key,
        )

        PaymentIntent = resolve_model("PaymentIntent", ["payment_intent", "payment_intents"])
        with session_scope() as db:
            intent = db.get(PaymentIntent, coerce_pk(intent_id))
            if intent is not None:
                intent.provider_ref = session.id
                intent.status = "pending"
                intent.simulator = False
                if hasattr(intent, "updated_at"):
                    from app.payments.settlement import utcnow

                    intent.updated_at = utcnow()
                meta = dict(getattr(intent, "meta", {}) or {})
                meta["stripe_url"] = session.url
                intent.meta = meta
                db.add(intent)
                db.commit()

        logger.info("stripe.initiated intent_id=%s job_id=%s session_id=%s", intent_id, job_id, session.id)
        return InitiateResult(kind="redirect", provider_ref=session.id, url=session.url)

    async def check_status(self, provider_ref: str) -> StatusResult:
        PaymentIntent = resolve_model("PaymentIntent", ["payment_intent", "payment_intents"])
        with session_scope() as db:
            stmt = (
                select(PaymentIntent)
                .where(PaymentIntent.provider_ref == provider_ref)
                .order_by(desc(PaymentIntent.created_at))
            )
            intent = db.execute(stmt).scalars().first()
            if intent is None:
                return StatusResult(status="expired", failure_reason="unknown_ref")
            return StatusResult(
                status=intent.status,
                failure_reason=getattr(intent, "failure_reason", None),
                settled_at=getattr(intent, "settled_at", None),
            )


try:
    registry.register(StripeCheckoutProvider())
except ValueError:
    logger.debug("stripe provider already registered")
