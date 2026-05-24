from __future__ import annotations

import importlib
import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator
from uuid import UUID

logger = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def resolve_model(class_name: str, module_candidates: list[str]):
    package = importlib.import_module("app.models")
    if hasattr(package, class_name):
        return getattr(package, class_name)

    for module_name in module_candidates:
        module = importlib.import_module(f"app.models.{module_name}")
        if hasattr(module, class_name):
            return getattr(module, class_name)

    raise ImportError(f"Could not resolve model {class_name}")


def coerce_pk(value: Any) -> Any:
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return value


def get_session_factory():
    database_module = importlib.import_module("app.database")

    for attr in ("SessionLocal", "session_factory", "sessionmaker"):
        factory = getattr(database_module, attr, None)
        if callable(factory):
            return factory

    engine = getattr(database_module, "engine", None)
    if engine is not None:
        from sqlalchemy.orm import sessionmaker

        return sessionmaker(bind=engine, autoflush=False, autocommit=False)

    raise RuntimeError("No SQLAlchemy session factory found in app.database")


@contextmanager
def session_scope() -> Iterator[Any]:
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        close = getattr(db, "close", None)
        if callable(close):
            close()


def _json_history_entry(intent: Any, settled_at: datetime, provider_ref: str | None) -> dict[str, Any]:
    return {
        "intent_id": str(getattr(intent, "id", "")),
        "provider_key": getattr(intent, "provider_key", None),
        "provider_ref": provider_ref or getattr(intent, "provider_ref", None),
        "amount": getattr(intent, "amount", None),
        "currency": getattr(intent, "currency", None),
        "settled_at": settled_at.isoformat(),
        "extended_through": getattr(intent, "extended_through", None).isoformat()
        if getattr(intent, "extended_through", None)
        else None,
    }


async def settle_intent(db, intent_id: str, provider_ref: str | None = None):
    """
    1. Find PaymentIntent by id
    2. If already completed -> return (idempotent)
    3. Update intent: status=completed, settled_at=now, provider_ref if provided
    4. Find associated Job
    5. Update job: featured_through = intent.extended_through
    6. Append to job.featured_charge_history JSONB array
    7. Log settlement
    """

    PaymentIntent = resolve_model("PaymentIntent", ["payment_intent", "payment_intents"])
    Job = resolve_model("Job", ["job", "jobs"])

    intent = db.get(PaymentIntent, coerce_pk(intent_id))
    if intent is None:
        logger.warning("payments.settle.intent_not_found intent_id=%s", intent_id)
        return None

    if getattr(intent, "status", None) == "completed":
        logger.info("payments.settle.idempotent intent_id=%s", intent_id)
        return intent

    settled_at = utcnow()
    intent.status = "completed"
    intent.settled_at = settled_at
    if hasattr(intent, "updated_at"):
        intent.updated_at = settled_at
    if provider_ref:
        intent.provider_ref = provider_ref

    job_id = getattr(intent, "job_id", None)
    job = db.get(Job, coerce_pk(job_id)) if job_id is not None else None
    if job is None:
        logger.warning("payments.settle.job_missing intent_id=%s job_id=%s", intent_id, job_id)
        db.commit()
        return intent

    if hasattr(job, "featured_through") and getattr(intent, "extended_through", None) is not None:
        job.featured_through = intent.extended_through
    if hasattr(job, "updated_at"):
        job.updated_at = settled_at

    existing_history = list(getattr(job, "featured_charge_history", None) or [])
    existing_history.append(_json_history_entry(intent, settled_at, provider_ref))
    if len(existing_history) > 50:
        existing_history = existing_history[-50:]
    if hasattr(job, "featured_charge_history"):
        job.featured_charge_history = existing_history

    db.add(intent)
    db.add(job)
    db.commit()

    logger.info(
        "payments.settle.completed intent_id=%s job_id=%s provider_key=%s provider_ref=%s",
        intent_id,
        job_id,
        getattr(intent, "provider_key", None),
        getattr(intent, "provider_ref", None),
    )
    return intent
