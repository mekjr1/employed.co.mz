from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PaymentInitiate(BaseModel):
    job_id: str
    provider_key: str
    payer_msisdn: str | None = None


class PaymentInitiateResponse(BaseModel):
    intent_id: str
    provider_key: str
    status: str
    kind: str
    redirect_url: str | None = None
    provider_ref: str | None = None


class PaymentStatusResponse(BaseModel):
    intent_id: str
    job_id: str | None = None
    provider_key: str
    status: str
    failure_reason: str | None = None
    extended_through: datetime | None = None
    settled_at: datetime | None = None


class PaymentProviderRead(BaseModel):
    key: str
    label: str
    market_key: str


class ProvidersResponse(BaseModel):
    market_key: str
    providers: list[PaymentProviderRead]
