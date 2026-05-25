"""Initial PostgreSQL schema for Employed.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-05-24 00:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None

job_status_enum = sa.Enum(
    "pending",
    "active",
    "flagged",
    "inactive",
    "filled",
    name="job_status_enum",
    create_type=False,
)
job_type_enum = sa.Enum(
    "Full Time",
    "Part Time",
    "Contract",
    "Temporary",
    "Internship",
    "Freelance",
    "Remote",
    "Volunteer",
    "Other",
    name="job_type_enum",
    create_type=False,
)
country_enum = sa.Enum("Mexico", "Mozambique", name="country_enum", create_type=False)
market_key_enum = sa.Enum("mx", "mz", name="market_key_enum", create_type=False)
salary_currency_enum = sa.Enum("MXN", "MZN", "USD", name="salary_currency_enum", create_type=False)
salary_period_enum = sa.Enum("hour", "day", "week", "month", "year", name="salary_period_enum", create_type=False)
profile_type_enum = sa.Enum("Individual", "Company", name="profile_type_enum", create_type=False)
profile_status_enum = sa.Enum("pending", "active", "flagged", name="profile_status_enum", create_type=False)
payment_provider_key_enum = sa.Enum("stripe", "mpesa", "emola", name="payment_provider_key_enum", create_type=False)
payment_status_enum = sa.Enum(
    "pending",
    "awaiting_user",
    "completed",
    "failed",
    "cancelled",
    "expired",
    name="payment_status_enum",
    create_type=False,
)
report_reason_enum = sa.Enum(
    "spam",
    "scam",
    "discriminatory",
    "wrong_country",
    "expired_or_filled",
    "duplicate",
    name="report_reason_enum",
    create_type=False,
)
report_resolution_enum = sa.Enum(
    "pending",
    "reviewed",
    "dismissed",
    "job_removed",
    name="report_resolution_enum",
    create_type=False,
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("username", sa.String(length=64), nullable=True),
        sa.Column("password_hash", sa.String(length=128), nullable=True),
        sa.Column("display_name", sa.String(length=128), nullable=True),
        sa.Column("roles", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column("oauth_providers", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_developer", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deletion_requested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deletion_scheduled_for", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )

    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("company", sa.String(length=256), nullable=True),
        sa.Column("country", country_enum, nullable=False),
        sa.Column("location", sa.String(length=256), nullable=True),
        sa.Column("url", sa.String(length=2048), nullable=True),
        sa.Column("contact", sa.String(length=512), nullable=False),
        sa.Column("apply_whatsapp", sa.String(length=32), nullable=True),
        sa.Column("job_type", job_type_enum, nullable=False),
        sa.Column("remote", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("html_description", sa.Text(), nullable=True),
        sa.Column("salary_min", sa.Integer(), nullable=True),
        sa.Column("salary_max", sa.Integer(), nullable=True),
        sa.Column("salary_currency", salary_currency_enum, nullable=True),
        sa.Column("salary_period", salary_period_enum, nullable=True),
        sa.Column("status", job_status_enum, nullable=False, server_default=sa.text("'pending'")),
        sa.Column("featured_through", sa.DateTime(timezone=True), nullable=True),
        sa.Column("featured_charge_history", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("status_history", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recaptcha_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_name", sa.String(length=128), nullable=True),
        sa.Column("custom_image_url", sa.String(length=2048), nullable=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("type", profile_type_enum, nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("location", sa.String(length=256), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("available_for_hire", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("interested_in", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column("contact", sa.String(length=512), nullable=True),
        sa.Column("url", sa.String(length=2048), nullable=True),
        sa.Column("resume_url", sa.String(length=2048), nullable=True),
        sa.Column("github_url", sa.String(length=2048), nullable=True),
        sa.Column("linkedin_url", sa.String(length=2048), nullable=True),
        sa.Column("stackoverflow_url", sa.String(length=2048), nullable=True),
        sa.Column("status", profile_status_enum, nullable=False, server_default=sa.text("'pending'")),
        sa.Column("random_sorter", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", name="uq_profiles_user_id"),
    )

    op.create_table(
        "payment_intents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("market_key", market_key_enum, nullable=False),
        sa.Column("provider_key", payment_provider_key_enum, nullable=False),
        sa.Column("provider_ref", sa.String(length=256), nullable=True),
        sa.Column("status", payment_status_enum, nullable=False, server_default=sa.text("'pending'")),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("payer_msisdn", sa.String(length=4), nullable=True),
        sa.Column("payer_msisdn_hash", sa.String(length=64), nullable=True),
        sa.Column("extended_through", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.String(length=256), nullable=True),
        sa.Column("simulator", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("settled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "job_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", report_reason_enum, nullable=False),
        sa.Column("details", sa.String(length=2000), nullable=True),
        sa.Column("reporter_ip_hash", sa.String(length=32), nullable=True),
        sa.Column("reporter_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolution", report_resolution_enum, nullable=False, server_default=sa.text("'pending'")),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("idx_jobs_user_id", "jobs", ["user_id"], unique=False)
    op.execute("CREATE INDEX idx_jobs_status_country_created ON jobs (status, country, created_at DESC)")
    op.execute("CREATE INDEX idx_jobs_featured ON jobs (featured_through) WHERE featured_through IS NOT NULL")
    op.execute("CREATE INDEX idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops)")
    op.execute("CREATE INDEX idx_jobs_company_trgm ON jobs USING gin (company gin_trgm_ops)")

    op.create_index("idx_payment_intents_job_user", "payment_intents", ["job_id", "user_id"], unique=False)
    op.execute("CREATE INDEX idx_payment_intents_provider_ref ON payment_intents (provider_ref) WHERE provider_ref IS NOT NULL")

    op.execute("CREATE INDEX idx_job_reports_resolution ON job_reports (resolution, created_at DESC)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_job_reports_resolution")
    op.execute("DROP INDEX IF EXISTS idx_payment_intents_provider_ref")
    op.drop_index("idx_payment_intents_job_user", table_name="payment_intents")
    op.execute("DROP INDEX IF EXISTS idx_jobs_company_trgm")
    op.execute("DROP INDEX IF EXISTS idx_jobs_title_trgm")
    op.execute("DROP INDEX IF EXISTS idx_jobs_featured")
    op.execute("DROP INDEX IF EXISTS idx_jobs_status_country_created")
    op.drop_index("idx_jobs_user_id", table_name="jobs")

    op.drop_table("job_reports")
    op.drop_table("payment_intents")
    op.drop_table("profiles")
    op.drop_table("jobs")
    op.drop_table("users")

    bind = op.get_bind()
    for enum in (
        report_resolution_enum,
        report_reason_enum,
        payment_status_enum,
        payment_provider_key_enum,
        profile_status_enum,
        profile_type_enum,
        salary_period_enum,
        salary_currency_enum,
        market_key_enum,
        country_enum,
        job_type_enum,
        job_status_enum,
    ):
        enum.drop(bind, checkfirst=True)
