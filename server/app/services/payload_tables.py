from __future__ import annotations

from typing import Any
from uuid import NAMESPACE_URL, uuid5

from app.schemas.column_schema import ColumnDataType


def _coerce_column_type(raw_type: Any) -> str:
    if isinstance(raw_type, ColumnDataType):
        return raw_type.value
    if raw_type is None:
        return ColumnDataType.string.value
    value = str(raw_type).lower()
    if value == "numeric":
        return ColumnDataType.number.value
    if value == "category":
        return ColumnDataType.enum.value
    if value == "index":
        return ColumnDataType.number.value
    if value == "date":
        return ColumnDataType.date.value
    if value == "boolean":
        return ColumnDataType.boolean.value
    if value == "file":
        return ColumnDataType.file.value
    return value


def _get_payload_tables(payload: dict | None) -> list[dict]:
    if not isinstance(payload, dict):
        return []
    tables = payload.get("tables")
    if not isinstance(tables, list):
        return []
    return [table for table in tables if isinstance(table, dict)]


def _pick_table(tables: list[dict], table_id: str | None) -> dict | None:
    if not tables:
        return None
    if table_id:
        for table in tables:
            if table.get("id") == table_id:
                return table
    return tables[0]


def extract_payload_table(
    payload: dict | None,
    table_id: str | None = None,
) -> tuple[list[dict], list[dict]]:
    tables = _get_payload_tables(payload)
    table = _pick_table(tables, table_id)
    if not table:
        return [], []

    raw_columns = table.get("columns")
    if not isinstance(raw_columns, list):
        raw_columns = []

    columns: list[dict] = []
    for index, column in enumerate(raw_columns):
        if not isinstance(column, dict):
            continue
        key = column.get("id") or column.get("key") or f"col-{index}"
        title = column.get("name") or column.get("title") or key
        source_type = column.get("type")
        col_type = _coerce_column_type(source_type)
        columns.append(
            {
                "key": key,
                "title": title,
                "type": col_type,
                "source_type": source_type,
            }
        )

    raw_rows = table.get("rows")
    if not isinstance(raw_rows, list):
        raw_rows = []

    table_id_value = table.get("id") or table_id or "table"
    rows: list[dict] = []
    for row_index, row in enumerate(raw_rows):
        values = {}
        if isinstance(row, list):
            for col_index, column in enumerate(columns):
                values[column["key"]] = row[col_index] if col_index < len(row) else None
        elif isinstance(row, dict):
            values = row
        row_uuid = str(uuid5(NAMESPACE_URL, f"{table_id_value}:{row_index}"))
        rows.append({"_rowId": row_uuid, "values_json": values})

    return columns, rows


def extract_payload_columns(payload: dict | None, table_id: str | None = None) -> list[dict]:
    columns, _ = extract_payload_table(payload, table_id)
    return columns
