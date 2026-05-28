from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.config import settings


def _smtp_ready() -> bool:
    return bool(settings.smtp_host and settings.email_from)


def send_email(*, to_email: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    if not _smtp_ready():
        return False

    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    client_cls = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP
    with client_cls(host=settings.smtp_host, port=settings.smtp_port, timeout=10) as client:
        if settings.smtp_use_tls and not settings.smtp_use_ssl:
            client.starttls()
        if settings.smtp_username and settings.smtp_password:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)
    return True


def send_verification_email(to_email: str, verify_url: str) -> bool:
    return send_email(
        to_email=to_email,
        subject="[Employed] Verify your email",
        text_body=f"Verify your email address by visiting: {verify_url}",
        html_body=f'<p>Verify your email address by clicking <a href="{verify_url}">this link</a>.</p>',
    )


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    return send_email(
        to_email=to_email,
        subject="[Employed] Reset your password",
        text_body=f"Reset your password by visiting: {reset_url}",
        html_body=f'<p>Reset your password by clicking <a href="{reset_url}">this link</a>.</p>',
    )


def send_registration_attempt_email(to_email: str) -> bool:
    return send_email(
        to_email=to_email,
        subject="[Employed] Registration attempt detected",
        text_body="Someone tried to register with this email address. If this was you, you can sign in or reset your password.",
        html_body="<p>Someone tried to register with this email address.</p><p>If this was you, you can sign in or reset your password.</p>",
    )


def send_job_submitted_email(to_email: str, job_title: str, job_url: str) -> bool:
    return send_email(
        to_email=to_email,
        subject=f"[Employed] Job received — {job_title}",
        text_body=f'Your job "{job_title}" has been received and is awaiting review. {job_url}',
        html_body=f'<p>Your job <strong>{job_title}</strong> has been received and is awaiting review.</p><p><a href="{job_url}">View job</a></p>',
    )


def send_job_status_changed_email(
    to_email: str, job_title: str, new_status: str, job_url: str, reason: str | None = None
) -> bool:
    reason_text = f" Reason: {reason}" if reason else ""
    reason_html = f"<p>Reason: {reason}</p>" if reason else ""
    return send_email(
        to_email=to_email,
        subject=f"[Employed] Job status updated — {job_title}",
        text_body=f'Your job "{job_title}" is now {new_status}.{reason_text} {job_url}',
        html_body=f'<p>Your job <strong>{job_title}</strong> is now <strong>{new_status}</strong>.</p>{reason_html}<p><a href="{job_url}">View job</a></p>',
    )
