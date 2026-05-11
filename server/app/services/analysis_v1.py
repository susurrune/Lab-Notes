from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.column_schema import ColumnSchema
from app.models.data_row import DataRow
from app.schemas.analysis_run import AnalysisFilter, MetricType
from app.schemas.column_schema import ColumnDataType
from app.services.payload_tables import extract_payload_table
from app.utils.tidy_adapter import tidy_adapter

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%Y.%m.%d",
    "%Y%m%d",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
)


def _parse_date(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return None
        iso_value = cleaned.replace("Z", "+00:00") if cleaned.endswith("Z") else cleaned
        try:
            return datetime.fromisoformat(iso_value)
        except ValueError:
            pass
        for fmt in _DATE_FORMATS:
            try:
                return datetime.strptime(cleaned, fmt)
            except ValueError:
                continue
    return None


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip().lower() in {"", "na", "null"}:
        return True
    return False


def _parse_filter_value(value: Any, col_type: str) -> Any:
    if _is_missing(value):
        return None
    if col_type == ColumnDataType.number.value:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
    if col_type == ColumnDataType.boolean.value:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            cleaned = value.strip().lower()
            if cleaned in {"true", "1"}:
                return True
            if cleaned in {"false", "0"}:
                return False
        return None
    if col_type == ColumnDataType.date.value:
        return _parse_date(value)
    return str(value)


def _compare(op: str, actual: Any, expected: Any) -> bool:
    if op == "eq":
        return actual == expected
    if op == "neq":
        return actual != expected
    if op == "contains" and isinstance(actual, str) and isinstance(expected, str):
        return expected.lower() in actual.lower()
    if actual is None or expected is None:
        return False
    if op == "gt":
        return actual > expected
    if op == "gte":
        return actual >= expected
    if op == "lt":
        return actual < expected
    if op == "lte":
        return actual <= expected
    return False


def _filter_rows(
    row_map: dict[str, dict[str, dict]],
    filters: list[AnalysisFilter],
    column_type_map: dict[str, str],
) -> list[str]:
    if not filters:
        return list(row_map.keys())

    matched: list[str] = []
    for row_id, columns in row_map.items():
        ok = True
        for filt in filters:
            col_key = filt.columnKey
            col_type = column_type_map.get(col_key, ColumnDataType.string.value)
            entry = columns.get(col_key)
            if entry is None or entry.get("isMissing"):
                expected = _parse_filter_value(filt.value, col_type)
                if expected is not None:
                    ok = False
                    break
                if filt.op not in {"eq", "neq"}:
                    ok = False
                    break
                if filt.op == "neq":
                    ok = False
                    break
                continue

            if col_type == ColumnDataType.number.value:
                actual = entry.get("valueNumber")
            elif col_type == ColumnDataType.boolean.value:
                actual = entry.get("valueBoolean")
            elif col_type == ColumnDataType.date.value:
                actual = _parse_date(entry.get("valueDate"))
            else:
                actual = entry.get("valueString")
            expected = _parse_filter_value(filt.value, col_type)
            if not _compare(filt.op, actual, expected):
                ok = False
                break
        if ok:
            matched.append(row_id)
    return matched


def _column_key(column: ColumnSchema | dict) -> str:
    if isinstance(column, dict):
        return column.get("key", "")
    return column.key


def _column_type(column: ColumnSchema | dict) -> str:
    if isinstance(column, dict):
        return column.get("type", ColumnDataType.string.value)
    return column.type


def _is_index(column: ColumnSchema | dict) -> bool:
    if isinstance(column, dict):
        return column.get("source_type") == "index"
    return False


def run_analysis(
    db: Session,
    dataset_id: str,
    filters: list[AnalysisFilter],
    group_by: str | None,
    metrics: list[MetricType],
    table_id: str | None = None,
    payload: dict | None = None,
) -> tuple[list[dict], list[str]]:
    payload_columns, payload_rows = extract_payload_table(payload, table_id)
    if payload_columns:
        columns = payload_columns
        rows = payload_rows
    else:
        columns = (
            db.query(ColumnSchema)
            .filter(ColumnSchema.dataset_id == dataset_id)
            .order_by(ColumnSchema.order_index)
            .all()
        )
        rows = (
            db.query(DataRow)
            .filter(DataRow.dataset_id == dataset_id)
            .order_by(DataRow.created_at.asc())
            .all()
        )

    tidy_rows = tidy_adapter(columns, rows)
    row_map: dict[str, dict[str, dict]] = {}
    for entry in tidy_rows:
        row_id = entry.get("_rowId")
        if not row_id:
            continue
        row_map.setdefault(row_id, {})[entry.get("columnKey")] = entry

    column_type_map = {_column_key(column): _column_type(column) for column in columns}
    numeric_columns = [
        _column_key(column)
        for column in columns
        if _column_type(column) == ColumnDataType.number.value and not _is_index(column)
    ]

    allowed_row_ids = _filter_rows(row_map, filters, column_type_map)

    def group_value(row_id: str) -> str:
        if not group_by:
            return "All"
        entry = row_map.get(row_id, {}).get(group_by)
        if not entry or entry.get("isMissing"):
            return "Missing"
        raw = entry.get("valueRaw")
        return str(raw) if raw is not None else "Missing"

    group_buckets: dict[str, dict[str, list[float]]] = {}
    for row_id in allowed_row_ids:
        group_key = group_value(row_id)
        group_buckets.setdefault(group_key, {})
        for col_key in numeric_columns:
            entry = row_map.get(row_id, {}).get(col_key)
            if not entry or entry.get("isMissing"):
                continue
            value = entry.get("valueNumber")
            if value is None:
                continue
            group_buckets[group_key].setdefault(col_key, []).append(value)

    if not metrics:
        metrics = [MetricType.count]

    result: list[dict] = []
    for group_key, col_map in group_buckets.items():
        for col_key in numeric_columns:
            values = col_map.get(col_key, [])
            row = {
                "group": group_key if group_by else None,
                "columnKey": col_key,
            }
            if MetricType.count in metrics:
                row["count"] = len(values)
            if values:
                if MetricType.sum in metrics:
                    row["sum"] = sum(values)
                if MetricType.avg in metrics:
                    row["avg"] = sum(values) / len(values)
                if MetricType.min in metrics:
                    row["min"] = min(values)
                if MetricType.max in metrics:
                    row["max"] = max(values)
            result.append(row)

    return result, allowed_row_ids
