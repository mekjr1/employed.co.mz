from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, *, limit: int, window_seconds: int) -> None:
        now = time.time()
        cutoff = now - window_seconds
        with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {window_seconds} seconds.",
                )
            bucket.append(now)


rate_limiter = InMemoryRateLimiter()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def rate_limit(limit: int, window_seconds: int, scope: str):
    async def dependency(request: Request) -> None:
        key = f"{scope}:{_client_ip(request)}"
        rate_limiter.hit(key, limit=limit, window_seconds=window_seconds)

    return dependency
