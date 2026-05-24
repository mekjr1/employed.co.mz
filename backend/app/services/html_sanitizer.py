from __future__ import annotations

import bleach

ALLOWED_TAGS = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "a",
    "ul",
    "ol",
    "li",
    "b",
    "i",
    "strong",
    "em",
    "code",
    "hr",
    "br",
    "pre",
    "blockquote",
]

ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "rel", "target"],
}

ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def _link_attrs(attrs, new=False):
    attrs[(None, "rel")] = "nofollow noopener noreferrer"
    attrs[(None, "target")] = "_blank"
    return attrs


def sanitize_html(value: str | None) -> str:
    cleaned = bleach.clean(
        value or "",
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    return bleach.linkify(cleaned, callbacks=[_link_attrs])
