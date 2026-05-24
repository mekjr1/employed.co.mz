from __future__ import annotations

import threading
import time
from collections import OrderedDict


class ReplayCache:
    def __init__(self, ttl_seconds: int = 300, max_entries: int = 10000):
        self.ttl_seconds = max(ttl_seconds, 1)
        self.max_entries = max(max_entries, 1)
        self._entries: OrderedDict[str, float] = OrderedDict()
        self._lock = threading.Lock()

    def _prune(self, now: float) -> None:
        expiry = now - self.ttl_seconds
        while self._entries:
            key, seen_at = next(iter(self._entries.items()))
            if seen_at > expiry and len(self._entries) <= self.max_entries:
                break
            self._entries.popitem(last=False)

    def contains(self, key: str | None) -> bool:
        if not key:
            return False
        now = time.monotonic()
        with self._lock:
            self._prune(now)
            if key not in self._entries:
                return False
            self._entries.move_to_end(key)
            return True

    def add(self, key: str | None) -> None:
        if not key:
            return
        now = time.monotonic()
        with self._lock:
            self._entries[key] = now
            self._entries.move_to_end(key)
            self._prune(now)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
