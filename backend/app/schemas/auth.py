from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.users import UserRead


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str | None = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    password: str = Field(min_length=8)


class OAuthCallback(BaseModel):
    code: str
    state: str | None = None


class MessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead | None = None


class TokenStatusResponse(BaseModel):
    message: str
    verified_at: datetime | None = None
