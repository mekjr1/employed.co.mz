from __future__ import annotations

import hashlib
import hmac
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.payments.settlement import coerce_pk, resolve_model, settle_intent, utcnow

logger = logging.getLogger(__name__)
router = APIRouter(tags=["webhooks"])


def _setting(name: str, default=None):
    return getattr(settings, name.lower(), getattr(settings, name, default))


def _verify_signature(raw_body: bytes, signature: str | None, secret: str | None, provider: str) -> None:
    if not secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"{provider}-webhook-secret-missing")
    if not signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"missing-{provider}-signature")

    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"invalid-{provider}-signature")


def _normalize_status(value: str | None) -> str:
    normalized = (value or "pending").strip().lower()
    if normalized in {"success", "successful", "paid"}:
        return "completed"
    if normalized in {"error", "declined"}:
        return "failed"
    if normalized in {"timeout", "timed_out"}:
        return "failed"
    return normalized


def _extract_payload_fields(payload: dict) -> tuple[str | None, str | None, str, str | None]:
    provider_ref = payload.get("provider_ref") or payload.get("providerRef") or payload.get("transactionId") or payload.get("conversationId")
    intent_id = payload.get("intent_id") or payload.get("intentId")
    status_value = payload.get("status") or payload.get("transactionStatus") or payload.get("resultCode")
    reason = payload.get("failure_reason") or payload.get("failureReason") or payload.get("resultDesc") or payload.get("message")
    return provider_ref, intent_id, _normalize_status(str(status_value) if status_value is not None else None), reason


def _find_intent(db: Session, provider_ref: str | None, intent_id: str | None):
    PaymentIntent = resolve_model("PaymentIntent", ["payment_intent", "payment_intents"])
    if intent_id:
        intent = db.get(PaymentIntent, coerce_pk(intent_id))
        if intent is not None:
            return intent
    if provider_ref:
        stmt = (
            select(PaymentIntent)
            .where(PaymentIntent.provider_ref == provider_ref)
            .order_by(desc(PaymentIntent.created_at))
        )
        return db.execute(stmt).scalars().first()
    return None


async def _handle_callback(provider: str, request: Request, db: Session, secret: str | None) -> dict:
    raw_body = await request.body()
    signature = request.headers.get(f"x-{provider}-signature") or request.headers.get("x-callback-signature")
    _verify_signature(raw_body, signature, secret, provider)

    payload = json.loads(raw_body.decode("utf-8") or "{}")
    provider_ref, intent_id, status_value, reason = _extract_payload_fields(payload)
    intent = _find_intent(db, provider_ref, intent_id)
    if intent is None:
        logger.warning("%s.webhook.intent_not_found provider_ref=%s intent_id=%s", provider, provider_ref, intent_id)
        return {"ok": True, "updated": False}

    if provider_ref:
        intent.provider_ref = provider_ref

    if status_value == "completed":
        await settle_intent(db, str(intent.id), provider_ref=provider_ref)
    else:
        intent.status = status_value
        intent.failure_reason = reason if status_value == "failed" else None
        if status_value in {"failed", "cancelled", "expired"}:
            intent.settled_at = utcnow()
        if hasattr(intent, "updated_at"):
            intent.updated_at = utcnow()
        db.add(intent)
        db.commit()

    logger.info("%s.webhook.processed intent_id=%s provider_ref=%s status=%s", provider, intent.id, provider_ref, status_value)
    return {"ok": True, "updated": True}


@router.post("/_mpesa/callback", include_in_schema=False)
async def mpesa_callback(request: Request, db: Session = Depends(get_db)) -> dict:
    return await _handle_callback("mpesa", request, db, _setting("MPESA_WEBHOOK_SECRET"))


@router.post("/_emola/callback", include_in_schema=False)
async def emola_callback(request: Request, db: Session = Depends(get_db)) -> dict:
    return await _handle_callback("emola", request, db, _setting("EMOLA_WEBHOOK_SECRET"))
