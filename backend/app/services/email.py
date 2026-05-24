from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Any

from app.config import settings


def _setting(name: str, default: Any = None) -> Any:
    return getattr(settings, name, default)


def _smtp_ready() -> bool:
    return bool(_setting("SMTP_HOST") and _setting("EMAIL_FROM"))


def send_email(*, to_email: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    if not _smtp_ready():
        return False

    message = EmailMessage()
    message["From"] = _setting("EMAIL_FROM")
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    host = _setting("SMTP_HOST")
    port = int(_setting("SMTP_PORT", 25))
    username = _setting("SMTP_USERNAME")
    password = _setting("SMTP_PASSWORD")
    use_tls = bool(_setting("SMTP_USE_TLS", False))
    use_ssl = bool(_setting("SMTP_USE_SSL", False))

    client_cls = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
    with client_cls(host=host, port=port, timeout=10) as client:
        if use_tls and not use_ssl:
            client.starttls()
        if username and password:
            client.login(username, password)
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


def send_job_submitted_email(to_email: str, job_title: str, job_url: str) -> bool:
    return send_email(
        to_email=to_email,
        subject=f"[Employed] Job received — {job_title}",
        text_body=f'Your job "{job_title}" has been received and is awaiting review. {job_url}',
        html_body=f'<p>Your job <strong>{job_title}</strong> has been received and is awaiting review.</p><p><a href="{job_url}">View job</a></p>',
    )


def send_job_status_changed_email(to_email: str, job_title: str, new_status: str, job_url: str, reason: str | None = None) -> bool:
    reason_text = f" Reason: {reason}" if reason else ""
    reason_html = f"<p>Reason: {reason}</p>" if reason else ""
    return send_email(
        to_email=to_email,
        subject=f"[Employed] Job status updated — {job_title}",
        text_body=f'Your job "{job_title}" is now {new_status}.{reason_text} {job_url}',
        html_body=f'<p>Your job <strong>{job_title}</strong> is now <strong>{new_status}</strong>.</p>{reason_html}<p><a href="{job_url}">View job</a></p>',
    )
