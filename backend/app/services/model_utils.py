from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import app.models as models


def resolve_model(*names: str):
    for name in names:
        model = getattr(models, name, None)
        if model is not None:
            return model
    raise RuntimeError(f"None of the models were found: {', '.join(names)}")


def get_attr(obj: Any, *names: str, default: Any = None) -> Any:
    for name in names:
        if hasattr(obj, name):
            value = getattr(obj, name)
            if value is not None:
                return value
    return default


def set_attr(obj: Any, value: Any, *names: str) -> bool:
    for name in names:
        if hasattr(obj, name) or hasattr(type(obj), name):
            setattr(obj, name, value)
            return True
    if names:
        setattr(obj, names[0], value)
        return True
    return False


def get_model_field(model: Any, *names: str):
    for name in names:
        field = getattr(model, name, None)
        if field is not None:
            return field
    return None


def query_all(db: Any, model: Any) -> list[Any]:
    return list(db.query(model).all())


def get_by_id(db: Any, model: Any, record_id: Any) -> Any | None:
    if hasattr(db, "get"):
        try:
            found = db.get(model, record_id)
            if found is not None:
                return found
        except TypeError:
            pass
    id_field = get_model_field(model, "id", "_id")
    if id_field is None:
        return None
    return db.query(model).filter(id_field == record_id).first()


def save(db: Any, obj: Any) -> Any:
    if hasattr(db, "add"):
        db.add(obj)
    db.commit()
    try:
        db.refresh(obj)
    except Exception:
        pass
    return obj


def delete(db: Any, obj: Any) -> None:
    if hasattr(db, "delete"):
        db.delete(obj)
    db.commit()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
