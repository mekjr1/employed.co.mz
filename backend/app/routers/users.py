from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth.dependencies import get_current_user, get_primary_email, get_user_id, get_user_roles, is_email_verified
from app.auth.jwt import create_verification_token
from app.database import get_db
from app.middleware.rate_limit import rate_limit
from app.schemas.auth import MessageResponse
from app.schemas.users import AccountDeletionResponse, UserExport, UserRead
from app.services.email import send_verification_email
from app.services.model_utils import get_attr, query_all, resolve_model, save, set_attr, utcnow

router = APIRouter(prefix="/users", tags=["users"])


def _serialize_user(user: Any) -> UserRead:
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


def _serialize_record(record: Any) -> dict[str, Any]:
    data = {}
    for key, value in getattr(record, "__dict__", {}).items():
        if key.startswith("_"):
            continue
        data[key] = value
    if not data:
        data["id"] = str(get_attr(record, "id", "_id", default=""))
    return data


@router.get("/me", response_model=UserRead)
def me(current_user: Any = Depends(get_current_user)):
    return _serialize_user(current_user)


@router.get("/me/export", response_model=UserExport, dependencies=[Depends(rate_limit(5, 3600, "user_export"))])
def export_my_data(db: Any = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = get_user_id(current_user)
    job_model = resolve_model("Job", "Jobs")
    jobs = [_serialize_record(job) for job in query_all(db, job_model) if get_attr(job, "user_id", "userId") == user_id]
    try:
        profile_model = resolve_model("Profile", "Profiles")
        profile = next((item for item in query_all(db, profile_model) if get_attr(item, "user_id", "userId") == user_id), None)
    except RuntimeError:
        profile = None
    try:
        payment_model = resolve_model("PaymentIntent", "PaymentIntents")
        payments = [_serialize_record(item) for item in query_all(db, payment_model) if get_attr(item, "user_id", "userId") == user_id]
    except RuntimeError:
        payments = []
    try:
        report_model = resolve_model("JobReport", "Report", "JobReports")
        reports = [_serialize_record(item) for item in query_all(db, report_model) if get_attr(item, "reporter_user_id", "reporterUserId") == user_id]
    except RuntimeError:
        reports = []
    return UserExport(
        generated_at=utcnow(),
        account=_serialize_record(current_user),
        jobs=jobs,
        profile=_serialize_record(profile) if profile else None,
        payments=payments,
        reports=reports,
    )


@router.post("/me/resend-verification", response_model=MessageResponse)
def resend_verification(request: Request, current_user: Any = Depends(get_current_user)):
    email = get_primary_email(current_user)
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No email address on file")
    if is_email_verified(current_user):
        return MessageResponse(message="Email already verified")
    token = create_verification_token(get_user_id(current_user), email)
    verify_url = str(request.base_url).rstrip("/") + f"/auth/verify-email/{token}"
    send_verification_email(email, verify_url)
    return MessageResponse(message="Verification email sent")


@router.post("/me/request-deletion", response_model=AccountDeletionResponse)
def request_deletion(db: Any = Depends(get_db), current_user: Any = Depends(get_current_user)):
    scheduled = utcnow().replace(microsecond=0) + timedelta(days=30)
    set_attr(current_user, utcnow(), "deletion_requested_at", "deletionRequestedAt")
    set_attr(current_user, scheduled, "deletion_scheduled_for", "deletionScheduledFor")
    save(db, current_user)
    return AccountDeletionResponse(message="Account deletion scheduled", scheduled_for=scheduled)


@router.post("/me/cancel-deletion", response_model=AccountDeletionResponse)
def cancel_deletion(db: Any = Depends(get_db), current_user: Any = Depends(get_current_user)):
    set_attr(current_user, None, "deletion_requested_at", "deletionRequestedAt")
    set_attr(current_user, None, "deletion_scheduled_for", "deletionScheduledFor")
    save(db, current_user)
    return AccountDeletionResponse(message="Account deletion cancelled", canceled=True)
