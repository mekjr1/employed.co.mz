from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ReportCreate(BaseModel):
    job_id: str
    reason: str
    details: str | None = None


class ReportResolve(BaseModel):
    resolution: str


class ReportRead(BaseModel):
    id: str
    job_id: str
    reason: str
    details: str | None = None
    reporter_user_id: str | None = None
    resolution: str | None = None
    resolved_by: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime | None = None

    class Config:
        orm_mode = True
