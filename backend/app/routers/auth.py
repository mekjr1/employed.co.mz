from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.auth.dependencies import get_primary_email, get_user_id, get_user_roles, is_email_verified
from app.auth.jwt import (
    create_password_reset_token,
    create_verification_token,
    decode_password_reset_token,
    decode_token,
    decode_verification_token,
    issue_token_pair,
)
from app.auth.oauth import authorize_redirect_url, exchange_code
from app.auth.passwords import hash_password, verify_password
from app.database import get_db
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    TokenStatusResponse,
)
from app.schemas.users import UserRead
from app.services.email import send_password_reset_email, send_verification_email
from app.services.model_utils import get_attr, query_all, resolve_model, save, set_attr, utcnow

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_model():
    return resolve_model("User")


def _user_to_read(user: Any) -> UserRead:
    return UserRead(
        id=str(get_user_id(user) or ""),
        email=get_primary_email(user),
        name=get_attr(user, "display_name", "name", "full_name", "username"),
        roles=get_user_roles(user),
        email_verified=is_email_verified(user),
        created_at=get_attr(user, "created_at", "createdAt"),
        deletion_requested_at=get_attr(user, "deletion_requested_at", "deletionRequestedAt"),
        deletion_scheduled_for=get_attr(user, "deletion_scheduled_for", "deletionScheduledFor"),
    )


def _find_user_by_email(db: Any, email: str):
    normalized = email.strip().lower()
    for user in query_all(db, _user_model()):
        current = (get_primary_email(user) or "").strip().lower()
        if current == normalized:
            return user
    return None


def _find_user_by_provider(db: Any, provider: str, provider_id: str | None):
    if not provider_id:
        return None
    for user in query_all(db, _user_model()):
        oauth_providers = get_attr(user, "oauth_providers", default={}) or {}
        if isinstance(oauth_providers, dict) and oauth_providers.get(provider) == provider_id:
            return user
        if get_attr(user, f"{provider}_id", f"{provider}Id", "oauth_subject") == provider_id and (
            get_attr(user, "oauth_provider") in (None, provider) or get_attr(user, f"{provider}_id", f"{provider}Id")
        ):
            return user
    return None


def _set_local_user_fields(user: Any, email: str, name: str | None, password: str) -> None:
    set_attr(user, email.strip().lower(), "email")
    if hasattr(user, "emails"):
        set_attr(user, [{"address": email.strip().lower(), "verified": False}], "emails")
    if name:
        set_attr(user, name, "display_name", "name", "full_name", "username")
    password_hash = hash_password(password)
    set_attr(user, password_hash, "password_hash", "hashed_password", "passwordHash")
    set_attr(user, False, "email_verified", "emailVerified")
    set_attr(user, [], "roles")
    set_attr(user, utcnow(), "created_at", "createdAt")


def _set_oauth_fields(user: Any, profile: dict) -> None:
    provider = profile["provider"]
    set_attr(user, profile.get("email"), "email")
    if hasattr(user, "emails") and profile.get("email"):
        set_attr(user, [{"address": profile.get("email"), "verified": True}], "emails")
    set_attr(user, profile.get("name"), "display_name", "name", "full_name", "username")
    set_attr(user, profile.get("provider_id"), f"{provider}_id", f"{provider}Id")
    set_attr(user, provider, "oauth_provider")
    set_attr(user, profile.get("provider_id"), "oauth_subject")
    set_attr(user, profile.get("avatar_url"), "avatar_url", "avatarUrl")
    oauth_providers = dict(get_attr(user, "oauth_providers", default={}) or {})
    oauth_providers[provider] = profile.get("provider_id")
    set_attr(user, oauth_providers, "oauth_providers")
    set_attr(user, True, "email_verified", "emailVerified")
    if get_attr(user, "created_at", "createdAt") is None:
        set_attr(user, utcnow(), "created_at", "createdAt")
    if get_attr(user, "roles") is None:
        set_attr(user, [], "roles")


def _token_response(user: Any) -> TokenResponse:
    pair = issue_token_pair(str(get_user_id(user)))
    return TokenResponse(
        access_token=pair.access_token,
        refresh_token=pair.refresh_token,
        token_type=pair.token_type,
        user=_user_to_read(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Any = Depends(get_db)):
    if _find_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    user = _user_model()()
    _set_local_user_fields(user, payload.email, payload.name, payload.password)
    saved = save(db, user)
    token = create_verification_token(str(get_user_id(saved)), payload.email.strip().lower())
    verify_url = str(request.base_url).rstrip("/") + f"/auth/verify-email/{token}"
    send_verification_email(payload.email.strip().lower(), verify_url)
    return _token_response(saved)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Any = Depends(get_db)):
    user = _find_user_by_email(db, payload.email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    hashed = get_attr(user, "password_hash", "hashed_password", "passwordHash")
    if not verify_password(payload.password, hashed):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return _token_response(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, db: Any = Depends(get_db)):
    try:
        token = decode_token(payload.refresh_token, expected_type="refresh")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
    user = next((item for item in query_all(db, _user_model()) if str(get_user_id(item)) == token.sub), None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return _token_response(user)


@router.post("/verify-email/{token}", response_model=TokenStatusResponse)
def verify_email(token: str, db: Any = Depends(get_db)):
    payload = decode_verification_token(token)
    user = next((item for item in query_all(db, _user_model()) if str(get_user_id(item)) == payload.sub), None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    set_attr(user, True, "email_verified", "emailVerified")
    if hasattr(user, "emails"):
        emails = get_attr(user, "emails", default=[])
        if isinstance(emails, list) and emails:
            first = emails[0]
            if isinstance(first, dict):
                first["verified"] = True
            else:
                setattr(first, "verified", True)
            set_attr(user, emails, "emails")
    save(db, user)
    return TokenStatusResponse(message="Email verified", verified_at=utcnow())


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Any = Depends(get_db)):
    user = _find_user_by_email(db, payload.email)
    if user is not None:
        token = create_password_reset_token(str(get_user_id(user)), payload.email.strip().lower())
        reset_url = str(request.base_url).rstrip("/") + f"/auth/reset-password/{token}"
        send_password_reset_email(payload.email.strip().lower(), reset_url)
    return MessageResponse(message="If an account exists for that email, a reset link has been sent")


@router.post("/reset-password/{token}", response_model=MessageResponse)
def reset_password(token: str, payload: ResetPasswordRequest, db: Any = Depends(get_db)):
    decoded = decode_password_reset_token(token)
    user = next((item for item in query_all(db, _user_model()) if str(get_user_id(item)) == decoded.sub), None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    set_attr(user, hash_password(payload.password), "password_hash", "hashed_password", "passwordHash")
    save(db, user)
    return MessageResponse(message="Password updated")


@router.get("/oauth/{provider}")
def oauth_redirect(provider: str, request: Request):
    return RedirectResponse(url=authorize_redirect_url(request, provider), status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/oauth/{provider}/callback", response_model=TokenResponse, name="oauth_callback")
async def oauth_callback(provider: str, request: Request, code: str, db: Any = Depends(get_db)):
    profile = await exchange_code(provider, request, code)
    user = _find_user_by_provider(db, provider, profile.get("provider_id"))
    if user is None and profile.get("email"):
        user = _find_user_by_email(db, profile["email"])
    if user is None:
        user = _user_model()()
    _set_oauth_fields(user, profile)
    saved = save(db, user)
    return _token_response(saved)
