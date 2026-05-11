from __future__ import annotations

from datetime import date, datetime
from typing import Any

from app.schemas.column_schema import ColumnDataType


_MISSING_VALUES = {"", "na", "null"}
_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%Y.%m.%d",
    "%Y%m%d",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
)


def _get_value(source: Any, key: str, default: Any = None) -> Any:
    if isinstance(source, dict):
        return source.get(key, default)
    return getattr(source, key, default)


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and value != value:
        return True
    if isinstance(value, str) and value.strip().lower() in _MISSING_VALUES:
        return True
    return False


def _normalize_raw(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def _parse_number(value: Any) -> tuple[float | None, bool]:
    if isinstance(value, bool):
        return None, False
    if isinstance(value, (int, float)):
        return float(value), True
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return None, False
        try:
            return float(cleaned), True
        except ValueError:
            return None, False
    return None, False


def _parse_boolean(value: Any) -> tuple[bool | None, bool]:
    if isinstance(value, bool):
        return value, True
    if isinstance(value, str):
        cleaned = value.strip().lower()
        if cleaned in {"true", "false"}:
            return cleaned == "true", True
        if cleaned in {"1", "0"}:
            return cleaned == "1", True
    return None, False


def _parse_date(value: Any) -> tuple[str | None, bool]:
    if isinstance(value, datetime):
        return value.isoformat(), True
    if isinstance(value, date):
        return value.isoformat(), True
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return None, False
        iso_value = cleaned.replace("Z", "+00:00") if cleaned.endswith("Z") else cleaned
        try:
            parsed = datetime.fromisoformat(iso_value)
            return parsed.isoformat(), True
        except ValueError:
            pass
        for fmt in _DATE_FORMATS:
            try:
                parsed = datetime.strptime(cleaned, fmt)
                return parsed.isoformat(), True
            except ValueError:
                continue
    return None, False


def _coerce_type(value: Any) -> str:
    if isinstance(value, ColumnDataType):
        return value.value
    if isinstance(value, str):
        return value
    return str(value)


def tidy_adapter(column_schemas: list[Any], rows: list[Any]) -> list[dict]:
    columns: list[tuple[str, str]] = []
    for schema in column_schemas:
        key = _get_value(schema, "key")
        if not key:
            continue
        col_type = _coerce_type(_get_value(schema, "type"))
        columns.append((key, col_type))

    long_rows: list[dict] = []
    for row in rows:
        row_id = (
            _get_value(row, "_rowId")
            or _get_value(row, "row_id")
            or _get_value(row, "rowId")
            or _get_value(row, "row_uuid")
        )
        values = _get_value(row, "values_json", {})
        if values is None:
            values = {}

        for column_key, column_type in columns:
            raw_value = values.get(column_key)
            is_missing = _is_missing(raw_value)
            parsed_ok = False
            value_number = None
            value_string = None
            value_date = None
            value_boolean = None

            if not is_missing:
                if column_type == ColumnDataType.number.value:
                    value_number, parsed_ok = _parse_number(raw_value)
                elif column_type == ColumnDataType.boolean.value:
                    value_boolean, parsed_ok = _parse_boolean(raw_value)
                elif column_type == ColumnDataType.date.value:
                    value_date, parsed_ok = _parse_date(raw_value)
                elif column_type in {ColumnDataType.string.value, ColumnDataType.enum.value, ColumnDataType.file.value}:
                    value_string = str(raw_value)
                    parsed_ok = True
                else:
                    value_string = str(raw_value)
                    parsed_ok = True

            long_rows.append(
                {
                    "_rowId": row_id,
                    "columnKey": column_key,
                    "valueRaw": _normalize_raw(raw_value) if not is_missing else None,
                    "valueNumber": value_number,
                    "valueString": value_string,
                    "valueDate": value_date,
                    "valueBoolean": value_boolean,
                    "parsedOk": parsed_ok,
                    "isMissing": is_missing,
                }
            )

    return long_rows
