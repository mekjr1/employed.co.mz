from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings


class TokenPayload(BaseModel):
    sub: str
    type: str
    exp: int | None = None
    email: str | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class VerificationTokenPayload(BaseModel):
    sub: str
    email: str
    type: str = "verify_email"
    exp: int | None = None


class PasswordResetTokenPayload(BaseModel):
    sub: str
    email: str
    type: str = "reset_password"
    exp: int | None = None


def _setting(*names: str, default: Any = None) -> Any:
    for name in names:
        value = getattr(settings, name, None)
        if value not in (None, ""):
            return value
    return default


def _secret_key() -> str:
    return str(_setting("JWT_SECRET_KEY", "SECRET_KEY", default="change-me"))


def _algorithm() -> str:
    return str(_setting("JWT_ALGORITHM", default="HS256"))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _create_token(subject: str, token_type: str, expires_delta: timedelta, extra: dict[str, Any] | None = None) -> str:
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "exp": _utcnow() + expires_delta,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _secret_key(), algorithm=_algorithm())


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    minutes = int(_setting("ACCESS_TOKEN_EXPIRE_MINUTES", default=30))
    return _create_token(subject, "access", timedelta(minutes=minutes), extra)


def create_refresh_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    days = int(_setting("REFRESH_TOKEN_EXPIRE_DAYS", default=7))
    return _create_token(subject, "refresh", timedelta(days=days), extra)


def create_verification_token(subject: str, email: str) -> str:
    hours = int(_setting("EMAIL_VERIFICATION_EXPIRE_HOURS", default=48))
    return _create_token(subject, "verify_email", timedelta(hours=hours), {"email": email})


def create_password_reset_token(subject: str, email: str) -> str:
    hours = int(_setting("PASSWORD_RESET_EXPIRE_HOURS", default=2))
    return _create_token(subject, "reset_password", timedelta(hours=hours), {"email": email})


def decode_token(token: str, expected_type: str | None = None) -> TokenPayload:
    try:
        payload = jwt.decode(token, _secret_key(), algorithms=[_algorithm()])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
    data = TokenPayload(**payload)
    if expected_type and data.type != expected_type:
        raise ValueError("Unexpected token type")
    return data


def decode_verification_token(token: str) -> VerificationTokenPayload:
    payload = decode_token(token, expected_type="verify_email")
    return VerificationTokenPayload(**payload.dict())


def decode_password_reset_token(token: str) -> PasswordResetTokenPayload:
    payload = decode_token(token, expected_type="reset_password")
    return PasswordResetTokenPayload(**payload.dict())


def issue_token_pair(subject: str, extra: dict[str, Any] | None = None) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(subject, extra=extra),
        refresh_token=create_refresh_token(subject, extra=extra),
    )
