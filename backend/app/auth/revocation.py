"""Refresh-token JTI revocation backend.

Primary store: Redis SET key `auth:revoked:<jti>` with TTL equal to the token's
remaining lifetime. Secondary fallback (no REDIS_URL or redis-py unreachable):
an in-process dict so dev/test environments still exercise the path.

This module is intentionally tiny + dependency-light. It must never raise into
the request lifecycle — a revocation lookup that fails should fall back to
"not revoked" (logged at WARNING) rather than 500-ing the user.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

REVOKED_KEY_PREFIX = "auth:revoked:"

_memory_lock = threading.Lock()
_memory_store: dict[str, float] = {}  # jti -> expiry epoch seconds


def _redis_url() -> str | None:
    url = getattr(settings, "redis_url", None)
    return url if url else None


def _redis_client() -> Any | None:
    url = _redis_url()
    if not url:
        return None
    try:
        from redis import Redis

        return Redis.from_url(url, socket_connect_timeout=2, socket_timeout=2)
    except Exception:  # noqa: BLE001 — redis is optional infra
        logger.warning("auth.revocation.redis_unavailable url=%s", url, exc_info=True)
        return None


def _prune_memory_store(now: float) -> None:
    expired = [jti for jti, exp in _memory_store.items() if exp <= now]
    for jti in expired:
        _memory_store.pop(jti, None)


def revoke_jti(jti: str, ttl_seconds: int) -> bool:
    """Record a revoked JTI. Returns True if the store accepted the write."""
    if not jti or ttl_seconds <= 0:
        return False
    client = _redis_client()
    if client is not None:
        try:
            client.set(f"{REVOKED_KEY_PREFIX}{jti}", "1", ex=ttl_seconds)
            return True
        except Exception:  # noqa: BLE001
            logger.warning("auth.revocation.redis_write_failed jti=%s", jti, exc_info=True)
        finally:
            close = getattr(client, "close", None)
            if callable(close):
                try:
                    close()
                except Exception:  # noqa: BLE001
                    pass
    # In-process fallback.
    now = time.time()
    with _memory_lock:
        _prune_memory_store(now)
        _memory_store[jti] = now + ttl_seconds
    return True


def is_revoked(jti: str) -> bool:
    if not jti:
        return False
    client = _redis_client()
    if client is not None:
        try:
            value = client.get(f"{REVOKED_KEY_PREFIX}{jti}")
            if value is not None:
                return True
        except Exception:  # noqa: BLE001
            logger.warning("auth.revocation.redis_read_failed jti=%s", jti, exc_info=True)
        finally:
            close = getattr(client, "close", None)
            if callable(close):
                try:
                    close()
                except Exception:  # noqa: BLE001
                    pass
    now = time.time()
    with _memory_lock:
        _prune_memory_store(now)
        return jti in _memory_store


def reset_memory_store() -> None:
    """Test helper — clear the in-process fallback between cases."""
    with _memory_lock:
        _memory_store.clear()
