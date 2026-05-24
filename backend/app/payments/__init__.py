from __future__ import annotations

import importlib
import logging
from collections.abc import Iterable

from app.payments.base import PaymentProvider

logger = logging.getLogger(__name__)


class PaymentRegistry:
    _providers: dict[str, PaymentProvider] = {}

    def register(self, provider: PaymentProvider) -> None:
        if not getattr(provider, "key", None):
            raise ValueError("provider.key is required")
        if provider.key in self._providers:
            raise ValueError(f"duplicate provider key: {provider.key}")
        self._providers[provider.key] = provider
        logger.info(
            "payments.provider.registered key=%s markets=%s simulator=%s",
            provider.key,
            getattr(provider, "markets", []),
            getattr(provider, "simulator", False),
        )

    def get(self, key: str) -> PaymentProvider:
        provider = self._providers.get(key)
        if provider is None:
            raise KeyError(f"Unknown payment provider: {key}")
        return provider

    def list_for_market(self, market_key: str) -> list[PaymentProvider]:
        return [
            provider
            for provider in self._providers.values()
            if self._market_matches(getattr(provider, "markets", []), market_key)
        ]

    def snapshot_for_market(self, market_key: str) -> list[dict]:
        return [
            {
                "key": provider.key,
                "name": provider.name,
                "simulator": bool(provider.simulator),
                "ui": dict(provider.ui or {"collect": "none"}),
            }
            for provider in self.list_for_market(market_key)
        ]

    def is_available(self, provider_key: str, market_key: str) -> bool:
        provider = self._providers.get(provider_key)
        return bool(provider and self._market_matches(getattr(provider, "markets", []), market_key))

    @staticmethod
    def _market_matches(markets: Iterable[str] | None, market_key: str) -> bool:
        if not markets:
            return True
        return market_key in markets


registry = PaymentRegistry()


for _module in (
    "app.payments.stripe_adapter",
    "app.payments.mpesa_adapter",
    "app.payments.emola_adapter",
):
    try:
        importlib.import_module(_module)
    except ModuleNotFoundError as exc:
        logger.warning("payments.provider.autoload_skipped module=%s missing=%s", _module, exc.name)


__all__ = ["PaymentProvider", "PaymentRegistry", "registry"]
