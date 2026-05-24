from __future__ import annotations

import secrets
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, Request, status

from app.config import settings

PROVIDERS = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
        "scopes": ["openid", "email", "profile"],
    },
    "facebook": {
        "authorize_url": "https://www.facebook.com/v19.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v19.0/oauth/access_token",
        "userinfo_url": "https://graph.facebook.com/me?fields=id,name,email,picture",
        "scopes": ["email", "public_profile"],
    },
    "github": {
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "email_url": "https://api.github.com/user/emails",
        "scopes": ["read:user", "user:email"],
    },
    "twitter": {
        "authorize_url": "https://twitter.com/i/oauth2/authorize",
        "token_url": "https://api.twitter.com/2/oauth2/token",
        "userinfo_url": "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
        "scopes": ["tweet.read", "users.read", "offline.access"],
    },
}


def _setting(provider: str, suffix: str):
    return getattr(settings, f"{provider.upper()}_{suffix}", None)


def provider_config(provider: str) -> dict:
    config = PROVIDERS.get(provider)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")
    client_id = _setting(provider, "CLIENT_ID")
    client_secret = _setting(provider, "CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"{provider} OAuth is not configured")
    return {**config, "client_id": client_id, "client_secret": client_secret}


def callback_url(request: Request, provider: str) -> str:
    return str(request.url_for("oauth_callback", provider=provider))


def authorize_redirect_url(request: Request, provider: str) -> str:
    config = provider_config(provider)
    state = secrets.token_urlsafe(24)
    params = {
        "client_id": config["client_id"],
        "redirect_uri": callback_url(request, provider),
        "response_type": "code",
        "scope": " ".join(config["scopes"]),
        "state": state,
    }
    return f"{config['authorize_url']}?{urlencode(params)}"


async def exchange_code(provider: str, request: Request, code: str) -> dict:
    config = provider_config(provider)
    async with httpx.AsyncClient(timeout=15) as client:
        token_response = await client.post(
            config["token_url"],
            headers={"Accept": "application/json"},
            data={
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": callback_url(request, provider),
            },
        )
        token_response.raise_for_status()
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="OAuth token exchange failed")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }
        user_response = await client.get(config["userinfo_url"], headers=headers)
        user_response.raise_for_status()
        profile = user_response.json()

        if provider == "github":
            email = profile.get("email")
            if not email and config.get("email_url"):
                email_response = await client.get(config["email_url"], headers=headers)
                email_response.raise_for_status()
                emails = email_response.json()
                primary = next((item for item in emails if item.get("primary")), None)
                if primary:
                    profile["email"] = primary.get("email")
        return normalize_profile(provider, profile)


def normalize_profile(provider: str, profile: dict) -> dict:
    if provider == "google":
        return {
            "provider": provider,
            "provider_id": profile.get("sub"),
            "email": profile.get("email"),
            "name": profile.get("name"),
            "avatar_url": profile.get("picture"),
        }
    if provider == "facebook":
        picture = ((profile.get("picture") or {}).get("data") or {}).get("url")
        return {
            "provider": provider,
            "provider_id": profile.get("id"),
            "email": profile.get("email"),
            "name": profile.get("name"),
            "avatar_url": picture,
        }
    if provider == "github":
        return {
            "provider": provider,
            "provider_id": str(profile.get("id")) if profile.get("id") is not None else None,
            "email": profile.get("email"),
            "name": profile.get("name") or profile.get("login"),
            "avatar_url": profile.get("avatar_url"),
        }
    if provider == "twitter":
        data = profile.get("data", profile)
        return {
            "provider": provider,
            "provider_id": data.get("id"),
            "email": data.get("email"),
            "name": data.get("name") or data.get("username"),
            "avatar_url": data.get("profile_image_url"),
        }
    raise HTTPException(status_code=404, detail="Unsupported OAuth provider")
