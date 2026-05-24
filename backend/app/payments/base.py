from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass
class InitiateResult:
    kind: str
    provider_ref: str | None = None
    url: str | None = None
    prompt: str | None = None


@dataclass
class StatusResult:
    status: str
    failure_reason: str | None = None
    settled_at: datetime | None = None


class PaymentProvider(ABC):
    key: str
    name: str
    markets: list[str]
    simulator: bool
    ui: dict[str, Any]

    @abstractmethod
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
        extended_through: datetime | None = None,
        **kwargs: Any,
    ) -> InitiateResult: ...

    @abstractmethod
    async def check_status(self, provider_ref: str) -> StatusResult: ...
