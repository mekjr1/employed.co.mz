from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth.dependencies import get_current_user, get_user_id, is_email_verified
from app.database import get_db
from app.middleware.market import get_current_market
from app.schemas.payments import PaymentInitiate, PaymentInitiateResponse, PaymentProviderRead, PaymentStatusResponse, ProvidersResponse
from app.services.market import MARKETS
from app.services.model_utils import get_attr, get_by_id, query_all, resolve_model, save, set_attr, utcnow

router = APIRouter(prefix="/payments", tags=["payments"])

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

    if payload.provider_key == "stripe":
        return PaymentInitiateResponse(
            intent_id=str(get_attr(saved, "id", "_id", default="")),
            provider_key=payload.provider_key,
            status=get_attr(saved, "status", default="pending"),
            kind="redirect",
            redirect_url=None,
        )
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
