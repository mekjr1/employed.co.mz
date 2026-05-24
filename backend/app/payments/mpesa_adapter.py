from __future__ import annotations

import hashlib
import logging
import re
import secrets
from datetime import timedelta
from typing import Any

from sqlalchemy import desc, select

from app.config import settings
from app.payments import registry
from app.payments.base import InitiateResult, PaymentProvider, StatusResult
from app.payments.settlement import coerce_pk, resolve_model, session_scope, utcnow

logger = logging.getLogger(__name__)
_MSISDN_RE = re.compile(r"^8[45]\d{7}$")


def _setting(name: str, default=None):
    return getattr(settings, name.lower(), getattr(settings, name, default))


def _normalize_msisdn(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D+", "", raw)
    if digits.startswith("258") and len(digits) >= 12:
        digits = digits[-9:]
    return digits if len(digits) == 9 else None


def _hash_msisdn(msisdn: str) -> str:
    return hashlib.sha256(f"{_setting('IP_SALT', '')}:{msisdn}".encode("utf-8")).hexdigest()


def _simulator_outcome(msisdn: str) -> tuple[str, int, str | None]:
    mapping = {
        "841111111": ("completed", 1000, None),
        "842222222": ("completed", 5000, None),
        "843333333": ("failed", 5000, "insufficient_funds"),
        "844444444": ("failed", 30000, "user_timeout"),
        "848888888": ("failed", 5000, "wrong_pin"),
    }
    return mapping.get(msisdn, ("completed", 5000, None))


async def _enqueue_simulated_intent(intent_id: str, outcome_status: str, outcome_reason: str | None, delay_ms: int) -> None:
    from arq import create_pool
    from arq.connections import RedisSettings

    redis = await create_pool(RedisSettings.from_dsn(_setting("REDIS_URL", "redis://localhost:6379/0")))
    try:
        await redis.enqueue_job(
            "settle_simulated_intent",
            intent_id,
            outcome_status,
            outcome_reason,
            _defer_by=timedelta(seconds=delay_ms / 1000),
        )
    finally:
        await redis.close()


class MpesaProvider(PaymentProvider):
    key = "mpesa"
    name = "M-Pesa"
    markets = ["mz"]
    simulator = bool(_setting("MPESA_SIMULATOR", True))
    ui = {"collect": "msisdn"}

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
        if not self.simulator:
            raise RuntimeError("mpesa-not-implemented")

        msisdn = _normalize_msisdn(payer_msisdn)
        if msisdn is None or not _MSISDN_RE.fullmatch(msisdn):
            raise ValueError("mpesa-invalid-msisdn")

        provider_ref = f"sim-mpesa-{secrets.token_hex(6)}"
        outcome_status, delay_ms, outcome_reason = _simulator_outcome(msisdn)

        PaymentIntent = resolve_model("PaymentIntent", ["payment_intent", "payment_intents"])
        with session_scope() as db:
            intent = db.get(PaymentIntent, coerce_pk(intent_id))
            if intent is not None:
                intent.provider_ref = provider_ref
                intent.status = "awaiting_user"
                intent.payer_msisdn = msisdn[-4:]
                intent.payer_msisdn_hash = _hash_msisdn(msisdn)
                intent.simulator = True
                intent.updated_at = utcnow()
                meta = dict(getattr(intent, "meta", {}) or {})
                meta.update(
                    {
                        "simulator_outcome": outcome_status,
                        "simulator_reason": outcome_reason,
                        "provider": "mpesa",
                    }
                )
                intent.meta = meta
                db.add(intent)
                db.commit()

        await _enqueue_simulated_intent(intent_id, outcome_status, outcome_reason, delay_ms)
        logger.info(
            "mpesa.simulated intent_id=%s job_id=%s provider_ref=%s outcome=%s delay_ms=%s",
            intent_id,
            job_id,
            provider_ref,
            outcome_status,
            delay_ms,
        )
        return InitiateResult(kind="await", provider_ref=provider_ref, prompt="mpesa.prompt.check_phone")

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
    registry.register(MpesaProvider())
except ValueError:
    logger.debug("mpesa provider already registered")
