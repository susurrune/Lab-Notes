from __future__ import annotations

from datetime import datetime

from app.schemas.column_schema import ColumnDataType

ColumnType = ColumnDataType

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%Y.%m.%d",
    "%Y%m%d",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
)


def _is_number(value: str) -> bool:
    cleaned = value.strip()
    if not cleaned:
        return False
    if cleaned.lower() in {"nan", "inf", "-inf", "infinity", "-infinity"}:
        return False
    try:
        float(cleaned)
        return True
    except ValueError:
        return False


def _is_boolean(value: str) -> bool:
    return value.strip().lower() in {"true", "false"}


def _is_date(value: str) -> bool:
    cleaned = value.strip()
    if not cleaned:
        return False
    iso_value = cleaned.replace("Z", "+00:00") if cleaned.endswith("Z") else cleaned
    try:
        datetime.fromisoformat(iso_value)
        return True
    except ValueError:
        pass
    for fmt in _DATE_FORMATS:
        try:
            datetime.strptime(cleaned, fmt)
            return True
        except ValueError:
            continue
    return False


def infer_column_type(values: list[str]) -> tuple[ColumnType, float]:
    cleaned = [value.strip() for value in values if value and value.strip()]
    if not cleaned:
        return ColumnType.string, 0.0

    total = len(cleaned)
    numeric_count = sum(1 for value in cleaned if _is_number(value))
    date_count = sum(1 for value in cleaned if _is_date(value))
    boolean_count = sum(1 for value in cleaned if _is_boolean(value))

    if numeric_count == total:
        return ColumnType.number, 1.0
    if date_count == total:
        return ColumnType.date, 1.0
    if boolean_count == total:
        return ColumnType.boolean, 1.0

    unique_count = len(set(cleaned))
    unique_ratio = unique_count / total
    if total >= 20:
        threshold_ratio = 0.2
    elif total >= 10:
        threshold_ratio = 0.3
    elif total >= 5:
        threshold_ratio = 0.4
    else:
        threshold_ratio = 0.5

    if unique_ratio <= threshold_ratio:
        return ColumnType.enum, round(1 - unique_ratio, 4)

    max_match_ratio = max(numeric_count, date_count, boolean_count) / total
    return ColumnType.string, round(1 - max_match_ratio, 4)
