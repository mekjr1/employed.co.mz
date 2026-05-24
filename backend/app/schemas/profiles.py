from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    name: str
    type: str
    title: str
    location: str
    description: str
    available_for_hire: bool = False
    interested_in: list[str] = Field(default_factory=list)
    contact: str | None = None
    url: str | None = None
    resume_url: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    stackoverflow_url: str | None = None
    custom_image_url: str | None = None


class ProfileUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    title: str | None = None
    location: str | None = None
    description: str | None = None
    available_for_hire: bool | None = None
    interested_in: list[str] | None = None
    contact: str | None = None
    url: str | None = None
    resume_url: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    stackoverflow_url: str | None = None
    custom_image_url: str | None = None


class ProfileRead(BaseModel):
    id: str
    user_id: str | None = None
    user_name: str | None = None
    name: str | None = None
    type: str | None = None
    title: str | None = None
    location: str | None = None
    description: str | None = None
    html_description: str | None = None
    available_for_hire: bool = False
    interested_in: list[str] = Field(default_factory=list)
    contact: str | None = None
    url: str | None = None
    resume_url: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    stackoverflow_url: str | None = None
    custom_image_url: str | None = None
    status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        orm_mode = True
