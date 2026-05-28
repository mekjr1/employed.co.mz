from __future__ import annotations

"""
MongoDB → PostgreSQL data migration for Employed.

Usage:
    python migrate_mongo_to_postgres.py \
        --mongo-uri mongodb://localhost:27017/employed \
        --postgres-uri postgresql://employed:pass@localhost:5432/employed \
        [--dry-run] [--batch-size 500]

Collections migrated:
    1. users (Meteor.users) → users table
    2. jobs → jobs table
    3. experts (profiles) → profiles table
    4. paymentIntents → payment_intents table
    5. jobReports → job_reports table

ID Strategy:
    - Generate deterministic UUIDs from Mongo _id using uuid5(NAMESPACE_URL, mongo_id)
    - This ensures re-runs produce the same UUIDs (idempotent)
    - Store mapping in memory for FK resolution
"""

import argparse
import logging
import sys
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid5

import sqlalchemy as sa
from pymongo import MongoClient
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, sessionmaker
from tqdm import tqdm

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models import Job, JobReport, PaymentIntent, Profile, User  # noqa: E402

logger = logging.getLogger("mongo_to_postgres")

CollectionTransformer = Callable[[dict[str, Any]], dict[str, Any]]

ID_MAP: dict[str, UUID] = {}
SUMMARY_TEMPLATE = {"migrated": 0, "skipped": 0, "errored": 0}


@dataclass(frozen=True)
class MigrationSpec:
    source_collection: str
    model: type[Any]
    transformer: CollectionTransformer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate Employed MongoDB data into PostgreSQL.")
    parser.add_argument("--mongo-uri", required=True, help="MongoDB connection string including database name")
    parser.add_argument("--postgres-uri", required=True, help="PostgreSQL connection string")
    parser.add_argument("--dry-run", action="store_true", help="Transform documents without writing to PostgreSQL")
    parser.add_argument("--batch-size", type=int, default=500, help="Batch size for PostgreSQL upserts")
    return parser.parse_args()


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def stable_uuid(raw_id: Any) -> UUID | None:
    if raw_id in (None, ""):
        return None
    key = str(raw_id)
    if key not in ID_MAP:
        ID_MAP[key] = uuid5(NAMESPACE_URL, key)
    return ID_MAP[key]


def utc_aware(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    return None


def nested_get(document: dict[str, Any], *path: str, default: Any = None) -> Any:
    current: Any = document
    for part in path:
        if not isinstance(current, dict):
            return default
        current = current.get(part)
        if current is None:
            return default
    return current


def first_email(document: dict[str, Any]) -> tuple[str | None, bool]:
    emails = document.get("emails") or []
    if not emails:
        return None, False
    first = emails[0] or {}
    if isinstance(first, dict):
        return first.get("address"), bool(first.get("verified", False))
    return None, False


def camel_to_snake(value: str) -> str:
    result: list[str] = []
    for index, char in enumerate(value):
        if char.isupper() and index > 0 and value[index - 1] not in {"_", "-"}:
            result.append("_")
        result.append(char.lower())
    return "".join(result).replace("-", "_")


def sanitize_json(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): sanitize_json(item) for key, item in value.items()}
    if isinstance(value, list):
        return [sanitize_json(item) for item in value]
    if isinstance(value, tuple):
        return [sanitize_json(item) for item in value]
    if isinstance(value, datetime):
        aware = utc_aware(value)
        return aware.isoformat() if aware else None
    if isinstance(value, UUID):
        return str(value)
    try:
        from bson import ObjectId  # imported lazily because it comes with pymongo

        if isinstance(value, ObjectId):
            return str(value)
    except Exception:  # pragma: no cover - defensive only
        pass
    return value


def snake_case_history(history: Iterable[dict[str, Any]] | None) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for entry in history or []:
        if not isinstance(entry, dict):
            continue
        normalized.append({camel_to_snake(str(key)): sanitize_json(value) for key, value in entry.items()})
    return normalized


def normalize_country(raw_country: Any, raw_market_key: Any) -> str | None:
    if raw_country:
        return str(raw_country)
    if str(raw_market_key or "").lower() == "mx":
        return "Mexico"
    if str(raw_market_key or "").lower() == "mz":
        return "Mozambique"
    return None


def normalize_roles(raw_roles: Any) -> list[str]:
    if raw_roles is None:
        return []
    if isinstance(raw_roles, str):
        return [raw_roles]
    return [str(role) for role in raw_roles if role is not None]


def normalize_oauth_providers(services: dict[str, Any] | None) -> dict[str, Any]:
    providers: dict[str, Any] = {}
    for provider in ("google", "facebook", "github", "twitter"):
        value = (services or {}).get(provider)
        if value:
            providers[provider] = sanitize_json(value)
    return providers


def transform_user(document: dict[str, Any]) -> dict[str, Any]:
    email, email_verified = first_email(document)
    return {
        "id": stable_uuid(document.get("_id")),
        "email": (email or nested_get(document, "services", "google", "email") or "").strip().lower() or None,
        "email_verified": email_verified,
        "username": document.get("username"),
        "password_hash": nested_get(document, "services", "password", "bcrypt"),
        "display_name": nested_get(document, "profile", "name") or document.get("username"),
        "roles": normalize_roles(document.get("roles")),
        "oauth_providers": normalize_oauth_providers(document.get("services")),
        "deletion_requested_at": utc_aware(document.get("deletionRequestedAt")),
        "deletion_scheduled_for": utc_aware(document.get("deletionScheduledFor")),
        "created_at": utc_aware(document.get("createdAt")) or utc_aware(document.get("created_at")),
        "updated_at": utc_aware(document.get("updatedAt")) or utc_aware(document.get("createdAt")),
    }


def transform_job(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": stable_uuid(document.get("_id")),
        "user_id": stable_uuid(document.get("userId")),
        "title": document.get("title"),
        "company": document.get("company"),
        "country": normalize_country(document.get("country"), document.get("marketKey")),
        "location": document.get("location"),
        "url": document.get("url"),
        "contact": document.get("contact") or document.get("email"),
        "apply_whatsapp": document.get("applyWhatsApp"),
        "job_type": document.get("jobtype") or document.get("jobType"),
        "remote": bool(document.get("remote", False)),
        "description": document.get("description") or document.get("htmlDescription") or "",
        "html_description": document.get("htmlDescription"),
        "salary_min": document.get("salaryMin"),
        "salary_max": document.get("salaryMax"),
        "salary_currency": document.get("salaryCurrency"),
        "salary_period": document.get("salaryPeriod"),
        "status": document.get("status") or "pending",
        "featured_through": utc_aware(document.get("featuredThrough")),
        "featured_charge_history": sanitize_json(document.get("featuredChargeHistory") or []),
        "status_history": snake_case_history(document.get("statusHistory") or []),
        "published_at": utc_aware(document.get("publishedAt")),
        "expired_at": utc_aware(document.get("expiredAt")),
        "created_at": utc_aware(document.get("createdAt")),
        "updated_at": utc_aware(document.get("updatedAt")) or utc_aware(document.get("createdAt")),
    }


def transform_profile(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": stable_uuid(document.get("_id")),
        "user_id": stable_uuid(document.get("userId")),
        "user_name": document.get("userName"),
        "custom_image_url": document.get("customImageUrl"),
        "name": document.get("name"),
        "type": document.get("type"),
        "title": document.get("title"),
        "location": document.get("location"),
        "description": document.get("description") or "",
        "available_for_hire": bool(document.get("availableForHire", False)),
        "interested_in": [str(item) for item in document.get("interestedIn") or []],
        "contact": document.get("contact"),
        "url": document.get("url"),
        "resume_url": document.get("resumeUrl"),
        "github_url": document.get("githubUrl"),
        "linkedin_url": document.get("linkedinUrl"),
        "stackoverflow_url": document.get("stackoverflowUrl"),
        "status": document.get("status") or "pending",
        "random_sorter": document.get("randomSorter"),
        "created_at": utc_aware(document.get("createdAt")),
        "updated_at": utc_aware(document.get("updatedAt")) or utc_aware(document.get("createdAt")),
    }


def transform_payment_intent(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": stable_uuid(document.get("_id")),
        "job_id": stable_uuid(document.get("jobId")),
        "user_id": stable_uuid(document.get("userId")),
        "market_key": document.get("marketKey"),
        "provider_key": document.get("providerKey"),
        "provider_ref": document.get("providerRef"),
        "status": document.get("status") or "pending",
        "amount": document.get("amount") or 0,
        "currency": document.get("currency"),
        "payer_msisdn": document.get("payerMsisdn"),
        "payer_msisdn_hash": document.get("payerMsisdnHash"),
        "extended_through": utc_aware(document.get("extendedThrough")),
        "failure_reason": document.get("failureReason"),
        "simulator": bool(document.get("simulator", False)),
        "meta": sanitize_json(document.get("meta") or {}),
        "settled_at": utc_aware(document.get("settledAt")),
        "created_at": utc_aware(document.get("createdAt")),
        "updated_at": utc_aware(document.get("updatedAt")) or utc_aware(document.get("createdAt")),
    }


def transform_job_report(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": stable_uuid(document.get("_id")),
        "job_id": stable_uuid(document.get("jobId")),
        "reason": document.get("reason"),
        "details": document.get("details"),
        "reporter_ip_hash": document.get("reporterIpHash"),
        "reporter_user_id": stable_uuid(document.get("reporterUserId")),
        "resolution": document.get("resolution") or "pending",
        "resolved_by": stable_uuid(document.get("resolvedBy")),
        "resolved_at": utc_aware(document.get("resolvedAt")),
        "created_at": utc_aware(document.get("createdAt")),
        "updated_at": utc_aware(document.get("updatedAt")) or utc_aware(document.get("createdAt")),
    }


def drop_none_values(values: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in values.items() if value is not None}


def validate_required_fields(model: type[Any], values: dict[str, Any]) -> None:
    table = model.__table__
    for column in table.columns:
        if column.primary_key:
            continue
        if (
            not column.nullable
            and column.server_default is None
            and column.default is None
            and values.get(column.name) is None
        ):
            raise ValueError(f"Missing required field '{column.name}'")


def build_upsert_statement(model: type[Any], batch: list[dict[str, Any]]) -> Any:
    table = model.__table__
    stmt = pg_insert(table).values(batch)
    update_columns = {column.name: stmt.excluded[column.name] for column in table.columns if not column.primary_key}
    primary_key_columns = [column.name for column in table.primary_key.columns]
    return stmt.on_conflict_do_update(index_elements=primary_key_columns, set_=update_columns)


def flush_batch(
    session: Session,
    model: type[Any],
    batch: list[dict[str, Any]],
    *,
    dry_run: bool,
    collection_name: str,
) -> tuple[int, int]:
    if not batch:
        return 0, 0
    if dry_run:
        return len(batch), 0
    try:
        with session.begin_nested():
            session.execute(build_upsert_statement(model, batch))
        return len(batch), 0
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Batch upsert failed for %s (%s rows): %s; retrying row-by-row", collection_name, len(batch), exc
        )
        migrated = 0
        errored = 0
        for row in batch:
            try:
                with session.begin_nested():
                    session.execute(build_upsert_statement(model, [row]))
                migrated += 1
            except Exception as row_exc:  # noqa: BLE001
                errored += 1
                logger.exception(
                    "Failed to upsert %s row %s: %s",
                    collection_name,
                    row.get("id"),
                    row_exc,
                )
        return migrated, errored


def migrate_collection(
    source_db: Any,
    session: Session,
    spec: MigrationSpec,
    *,
    batch_size: int,
    dry_run: bool,
    summary: dict[str, dict[str, int]],
) -> None:
    collection = source_db[spec.source_collection]
    total = collection.count_documents({})
    stats = summary[spec.source_collection]
    buffer: list[dict[str, Any]] = []

    logger.info("Migrating %s (%s documents)", spec.source_collection, total)
    progress = tqdm(
        collection.find({}, no_cursor_timeout=True).batch_size(batch_size), total=total, desc=spec.source_collection
    )

    for document in progress:
        raw_id = document.get("_id")
        try:
            transformed = drop_none_values(spec.transformer(document))
            validate_required_fields(spec.model, transformed)
            buffer.append(transformed)
            if len(buffer) >= batch_size:
                migrated, errored = flush_batch(
                    session,
                    spec.model,
                    buffer,
                    dry_run=dry_run,
                    collection_name=spec.source_collection,
                )
                stats["migrated"] += migrated
                stats["errored"] += errored
                buffer.clear()
        except Exception as exc:  # noqa: BLE001
            stats["errored"] += 1
            logger.exception("Failed to migrate %s document %s: %s", spec.source_collection, raw_id, exc)
        finally:
            progress.set_postfix(stats)

    if buffer:
        migrated, errored = flush_batch(
            session,
            spec.model,
            buffer,
            dry_run=dry_run,
            collection_name=spec.source_collection,
        )
        stats["migrated"] += migrated
        stats["errored"] += errored
        buffer.clear()
    progress.close()


def print_summary(summary: dict[str, dict[str, int]]) -> None:
    logger.info("Migration summary")
    for collection_name, stats in summary.items():
        logger.info(
            "  %s -> migrated=%s skipped=%s errored=%s",
            collection_name,
            stats["migrated"],
            stats["skipped"],
            stats["errored"],
        )


def main() -> int:
    args = parse_args()
    configure_logging()

    mongo_client = MongoClient(args.mongo_uri, tz_aware=True)
    source_db = mongo_client.get_default_database()
    if source_db is None:
        raise RuntimeError("The Mongo URI must include a database name")

    engine = sa.create_engine(args.postgres_uri, future=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    migration_order = [
        MigrationSpec("users", User, transform_user),
        MigrationSpec("jobs", Job, transform_job),
        MigrationSpec("experts", Profile, transform_profile),
        MigrationSpec("paymentIntents", PaymentIntent, transform_payment_intent),
        MigrationSpec("jobReports", JobReport, transform_job_report),
    ]
    summary = {spec.source_collection: dict(SUMMARY_TEMPLATE) for spec in migration_order}

    logger.info("Starting migration dry_run=%s batch_size=%s", args.dry_run, args.batch_size)
    try:
        with SessionLocal() as session:
            transaction = session.begin()
            try:
                for spec in migration_order:
                    migrate_collection(
                        source_db,
                        session,
                        spec,
                        batch_size=args.batch_size,
                        dry_run=args.dry_run,
                        summary=summary,
                    )
                if args.dry_run:
                    transaction.rollback()
                    logger.info("Dry run complete; rolled back transaction")
                else:
                    transaction.commit()
            except Exception:
                transaction.rollback()
                raise
    finally:
        mongo_client.close()
        engine.dispose()

    print_summary(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
