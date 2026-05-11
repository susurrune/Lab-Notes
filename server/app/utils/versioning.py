from __future__ import annotations

from enum import Enum
from typing import Any

from sqlalchemy.orm import Session

from app.models.dataset import Dataset


class DatasetChangeType(str, Enum):
    schema = "schema"
    rows = "rows"


def _normalize_version(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return 0


def compare_version(old_version: Any, new_version: Any) -> int:
    old_value = _normalize_version(old_version)
    new_value = _normalize_version(new_version)
    if new_value == old_value:
        return 0
    return 1 if new_value > old_value else -1


def increment_dataset_version(
    db: Session,
    dataset: Dataset,
    change_type: DatasetChangeType,
) -> Dataset:
    dataset.version += 1
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset
