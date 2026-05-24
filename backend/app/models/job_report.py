from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ReportReason, ReportResolution, pg_enum

if TYPE_CHECKING:
    from uuid import UUID

    from app.models.job import Job
    from app.models.user import User


class JobReport(Base):
    __tablename__ = "job_reports"

    job_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    reason: Mapped[ReportReason] = mapped_column(pg_enum(ReportReason, "report_reason_enum"), nullable=False)
    details: Mapped[str | None] = mapped_column(sa.String(2000))
    reporter_ip_hash: Mapped[str | None] = mapped_column(sa.String(32))
    reporter_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("users.id", ondelete="SET NULL"),
    )
    resolution: Mapped[ReportResolution] = mapped_column(
        pg_enum(ReportResolution, "report_resolution_enum"),
        nullable=False,
        default=ReportResolution.pending,
        server_default=sa.text("'pending'"),
    )
    resolved_by: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("users.id", ondelete="SET NULL"),
    )
    resolved_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))

    job: Mapped[Job] = relationship(back_populates="reports")
    reporter_user: Mapped[User | None] = relationship(
        back_populates="reported_job_reports",
        foreign_keys=[reporter_user_id],
    )
    resolver_user: Mapped[User | None] = relationship(
        back_populates="resolved_job_reports",
        foreign_keys=[resolved_by],
    )
