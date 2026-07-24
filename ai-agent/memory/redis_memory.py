"""
Long-term memory + cache for the incident agent, backed by Redis.

Stores:
  * repository memory summaries (parsed structure, frameworks, graphs)
  * historical incident memory (resolved incidents + their fixes)
  * cached tool results / frequently-accessed context

Redis is optional: if a server isn't reachable (or the `redis` package isn't
installed) everything transparently falls back to an in-process store, so the
agent runs anywhere while still using Redis in production where it's beneficial.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_KEY_INCIDENTS = "unify:incident:history"
_KEY_REPO_MEMORY = "unify:repo:memory:"      # + repo id
_KEY_CACHE = "unify:cache:"                  # + key


def _connect():
    try:
        import redis  # type: ignore

        client = redis.from_url(REDIS_URL, decode_responses=True)
        client.ping()
        return client
    except Exception:
        return None


class _InMemory:
    """Minimal Redis-like fallback (get/set/rpush/lrange/expire)."""

    def __init__(self) -> None:
        self.kv: dict[str, Any] = {}
        self.lists: dict[str, list[str]] = {}
        self.expiry: dict[str, float] = {}

    def _expired(self, key: str) -> bool:
        exp = self.expiry.get(key)
        if exp is not None and exp < time.time():
            self.kv.pop(key, None)
            self.expiry.pop(key, None)
            return True
        return False

    def get(self, key: str):
        return None if self._expired(key) else self.kv.get(key)

    def set(self, key: str, value: str, ex: int | None = None):
        self.kv[key] = value
        if ex:
            self.expiry[key] = time.time() + ex

    def rpush(self, key: str, value: str):
        self.lists.setdefault(key, []).append(value)

    def lrange(self, key: str, start: int, end: int):
        items = self.lists.get(key, [])
        if end == -1:
            return items[start:]
        return items[start : end + 1]


class RedisMemory:
    def __init__(self) -> None:
        self.client = _connect()
        self.backend = self.client or _InMemory()
        self.using_redis = self.client is not None

    # ── generic cache ────────────────────────────────────────────────────
    def cache_get(self, key: str):
        raw = self.backend.get(_KEY_CACHE + key)
        return json.loads(raw) if raw else None

    def cache_set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        self.backend.set(_KEY_CACHE + key, json.dumps(value), ex=ttl_seconds)

    # ── repository memory ────────────────────────────────────────────────
    def set_repo_memory(self, repo_id: str, data: dict) -> None:
        self.backend.set(_KEY_REPO_MEMORY + repo_id, json.dumps(data))

    def get_repo_memory(self, repo_id: str) -> dict | None:
        raw = self.backend.get(_KEY_REPO_MEMORY + repo_id)
        return json.loads(raw) if raw else None

    # ── historical incident memory ───────────────────────────────────────
    def remember_incident(self, incident: dict) -> None:
        incident = {**incident, "stored_at": time.time()}
        self.backend.rpush(_KEY_INCIDENTS, json.dumps(incident))

    def all_incidents(self) -> list[dict]:
        raw = self.backend.lrange(_KEY_INCIDENTS, 0, -1)
        out = []
        for item in raw:
            try:
                out.append(json.loads(item))
            except Exception:
                pass
        return out

    def similar_incidents(self, text: str, k: int = 3) -> list[dict]:
        """Token-overlap (Jaccard) similarity over stored incident text."""
        query = _tokens(text)
        scored = []
        for inc in self.all_incidents():
            other = _tokens(f"{inc.get('incident', '')} {inc.get('category', '')} {inc.get('root_cause', '')}")
            if not other:
                continue
            score = _jaccard(query, other)
            if score > 0:
                scored.append({**inc, "similarity": round(score, 3)})
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:k]


def _tokens(text: str) -> set[str]:
    return {t for t in "".join(c.lower() if c.isalnum() else " " for c in text).split() if len(t) > 2}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


# Module-level singleton.
memory = RedisMemory()
