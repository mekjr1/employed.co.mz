from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class UserRead(BaseModel):
    id: str
    email: str | None = None
    name: str | None = None
    roles: list[str] = Field(default_factory=list)
    email_verified: bool = False
    created_at: datetime | None = None
    deletion_requested_at: datetime | None = None
    deletion_scheduled_for: datetime | None = None

    class Config:
        orm_mode = True


class UserExport(BaseModel):
    generated_at: datetime
    account: dict[str, Any]
    jobs: list[dict[str, Any]] = []
    profile: dict[str, Any] | None = None
    payments: list[dict[str, Any]] = []
    reports: list[dict[str, Any]] = []


class AccountDeletionResponse(BaseModel):
    scheduled_for: datetime | None = None
    canceled: bool = False
    message: str
