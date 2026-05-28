from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth.dependencies import get_current_user, get_primary_email, get_user_id, is_email_verified
from app.database import get_db
from app.middleware.market import get_current_market
from app.payments import registry as payment_registry
from app.schemas.payments import PaymentInitiate, PaymentInitiateResponse, PaymentProviderRead, PaymentStatusResponse, ProvidersResponse
from app.services.market import MARKETS
from app.services.model_utils import get_attr, get_by_id, get_model_field, query_all, resolve_model, save, set_attr, utcnow

router = APIRouter(prefix="/payments", tags=["payments"])
logger = logging.getLogger(__name__)

PROVIDER_LABELS = {"stripe": "Stripe", "mpesa": "M-Pesa", "emola": "e-Mola"}


def _intent_model():
    return resolve_model("PaymentIntent", "PaymentIntents")


def _job_model():
    return resolve_model("Job", "Jobs")


def _intent_to_status(intent: Any) -> PaymentStatusResponse:
    return PaymentStatusResponse(
        intent_id=str(get_attr(intent, "id", "_id", default="")),
        job_id=get_attr(intent, "job_id", "jobId"),
        provider_key=get_attr(intent, "provider_key", "providerKey", default=""),
        status=get_attr(intent, "status", default="pending"),
        failure_reason=get_attr(intent, "failure_reason", "failureReason"),
        extended_through=get_attr(intent, "extended_through", "extendedThrough"),
        settled_at=get_attr(intent, "settled_at", "settledAt"),
    )


def _find_owned_intent(db: Any, intent_id: str, user_id: str):
    intent = get_by_id(db, _intent_model(), intent_id)
    if intent is None or get_attr(intent, "user_id", "userId") != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment intent not found")
    return intent


def _build_initiate_response(intent: Any, redirect_url: str | None = None) -> PaymentInitiateResponse:
    provider_key = get_attr(intent, "provider_key", "providerKey", default="")
    is_stripe = provider_key == "stripe"
    # Prefer the explicit redirect_url arg; fall back to meta.stripe_url stored by the adapter
    meta = get_attr(intent, "meta", default={}) or {}
    resolved_redirect = redirect_url or (meta.get("stripe_url") if is_stripe else None)
    return PaymentInitiateResponse(
        intent_id=str(get_attr(intent, "id", "_id", default="")),
        provider_key=provider_key,
        status=get_attr(intent, "status", default="pending"),
        kind="redirect" if is_stripe else "await",
        redirect_url=resolved_redirect,
        provider_ref=None if is_stripe else get_attr(intent, "provider_ref", "providerRef"),
    )


def _find_existing_open_intent(db: Any, job_id: str, user_id: str):
    intent_model = _intent_model()
    open_statuses = {"pending", "awaiting_user"}
    job_field = get_model_field(intent_model, "job_id", "jobId")
    user_field = get_model_field(intent_model, "user_id", "userId")
    status_field = get_model_field(intent_model, "status")
    created_field = get_model_field(intent_model, "created_at", "createdAt")

    if all(field is not None for field in (job_field, user_field, status_field)) and hasattr(db, "query"):
        query = db.query(intent_model).filter(
            job_field == job_id,
            user_field == user_id,
            status_field.in_(tuple(open_statuses)),
        )
        if created_field is not None:
            query = query.order_by(created_field.desc())
        existing = query.first()
        if existing is not None:
            return existing

    existing = [
        intent
        for intent in query_all(db, intent_model)
        if get_attr(intent, "job_id", "jobId") == job_id
        and get_attr(intent, "user_id", "userId") == user_id
        and get_attr(intent, "status", default="pending") in open_statuses
    ]
    existing.sort(key=lambda intent: get_attr(intent, "created_at", "createdAt") or utcnow(), reverse=True)
    return existing[0] if existing else None


@router.post("/initiate", response_model=PaymentInitiateResponse, status_code=status.HTTP_201_CREATED)
def initiate_payment(
    payload: PaymentInitiate,
    request: Request,
    db: Any = Depends(get_db),
    market: dict = Depends(get_current_market),
    current_user: Any = Depends(get_current_user),
):
    if not is_email_verified(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email verification required")
    if payload.provider_key not in market["payment_providers"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provider is not available for this market")
    job = get_by_id(db, _job_model(), payload.job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if get_attr(job, "user_id", "userId") != get_user_id(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only pay for your own job")
    if get_attr(job, "status") not in {"pending", "active"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This job cannot be featured")

    existing_intent = _find_existing_open_intent(db, payload.job_id, get_user_id(current_user))
    if existing_intent is not None:
        return _build_initiate_response(existing_intent)

    intent = _intent_model()()
    price = market["featured_job"]
    now = utcnow()
    featured_through = get_attr(job, "featured_through", "featuredThrough")
    basis = featured_through if featured_through and featured_through > now else now
    extended_through = basis + timedelta(days=30)

    set_attr(intent, payload.job_id, "job_id", "jobId")
    set_attr(intent, get_user_id(current_user), "user_id", "userId")
    set_attr(intent, market["key"], "market_key", "marketKey")
    set_attr(intent, payload.provider_key, "provider_key", "providerKey")
    set_attr(intent, price["amount"], "amount")
    set_attr(intent, price["currency"], "currency")
    set_attr(intent, extended_through, "extended_through", "extendedThrough")
    set_attr(intent, payload.payer_msisdn[-4:] if payload.payer_msisdn else None, "payer_msisdn", "payerMsisdn")
    set_attr(intent, "pending" if payload.provider_key == "stripe" else "awaiting_user", "status")
    set_attr(intent, utcnow(), "created_at", "createdAt")
    set_attr(intent, utcnow(), "updated_at", "updatedAt")
    set_attr(intent, payload.provider_key != "stripe", "simulator")
    saved = save(db, intent)

    # Invoke the registered payment adapter
    intent_id = str(get_attr(saved, "id", "_id", default=""))
    user_email = get_primary_email(current_user) if hasattr(current_user, "email") else None
    base_url = str(request.base_url).rstrip("/")
    job_title = get_attr(job, "title", default="")

    try:
        adapter = payment_registry.get(payload.provider_key)
        import asyncio
        result = asyncio.get_event_loop().run_until_complete(
            adapter.initiate(
                intent_id=intent_id,
                job_id=payload.job_id,
                user_id=str(get_user_id(current_user)),
                amount=price["amount"],
                currency=price["currency"],
                payer_msisdn=payload.payer_msisdn,
                return_url=f"{base_url}/jobs/{payload.job_id}",
                cancel_url=f"{base_url}/jobs/{payload.job_id}",
                customer_email=user_email,
                extended_through=extended_through,
                market_key=market["key"],
                job_title=job_title,
            )
        )
        db.refresh(saved)
        redirect_url = result.url
        if result.provider_ref and not get_attr(saved, "provider_ref", "providerRef"):
            set_attr(saved, result.provider_ref, "provider_ref", "providerRef")
            save(db, saved)

        if payload.provider_key == "stripe":
            return _build_initiate_response(saved, redirect_url=redirect_url)
        return PaymentInitiateResponse(
            intent_id=intent_id,
            provider_key=payload.provider_key,
            status=get_attr(saved, "status", default="awaiting_user"),
            kind="await",
            provider_ref=get_attr(saved, "provider_ref", "providerRef") or result.provider_ref,
        )
    except (KeyError, RuntimeError) as adapter_exc:
        # Adapter not configured (e.g. Stripe keys missing) — fall back to stub response
        logger.warning(
            "payments.adapter.unavailable provider=%s intent_id=%s reason=%s",
            payload.provider_key,
            intent_id,
            adapter_exc,
        )

    if payload.provider_key == "stripe":
        return _build_initiate_response(saved)
    provider_ref = f"pending-{get_attr(saved, 'id', '_id', default='intent')}"
    set_attr(saved, provider_ref, "provider_ref", "providerRef")
    save(db, saved)
    return PaymentInitiateResponse(
        intent_id=str(get_attr(saved, "id", "_id", default="")),
        provider_key=payload.provider_key,
        status=get_attr(saved, "status", default="awaiting_user"),
        kind="await",
        provider_ref=provider_ref,
    )


@router.get("/{intent_id}/status", response_model=PaymentStatusResponse)
def payment_status(intent_id: str, db: Any = Depends(get_db), current_user: Any = Depends(get_current_user)):
    intent = _find_owned_intent(db, intent_id, get_user_id(current_user))
    return _intent_to_status(intent)


@router.post("/{intent_id}/cancel", response_model=PaymentStatusResponse)
def cancel_payment(intent_id: str, db: Any = Depends(get_db), current_user: Any = Depends(get_current_user)):
    intent = _find_owned_intent(db, intent_id, get_user_id(current_user))
    if get_attr(intent, "status") in {"pending", "awaiting_user"}:
        set_attr(intent, "cancelled", "status")
        set_attr(intent, "user_cancelled", "failure_reason", "failureReason")
        set_attr(intent, utcnow(), "settled_at", "settledAt")
        set_attr(intent, utcnow(), "updated_at", "updatedAt")
        save(db, intent)
    return _intent_to_status(intent)


@router.get("/providers", response_model=ProvidersResponse)
def providers_for_market(market: dict = Depends(get_current_market)):
    return ProvidersResponse(
        market_key=market["key"],
        providers=[
            PaymentProviderRead(key=provider, label=PROVIDER_LABELS.get(provider, provider.title()), market_key=market["key"])
            for provider in MARKETS[market["key"]]["payment_providers"]
        ],
    )
