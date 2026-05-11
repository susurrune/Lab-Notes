from __future__ import annotations

from typing import Any

from app.schemas.column_schema import ColumnDataType


def _coerce_type(value: Any) -> str:
    if isinstance(value, ColumnDataType):
        return value.value
    if value is None:
        return ColumnDataType.string.value
    return str(value).lower()


def _get_value(column: Any, key: str) -> Any:
    if isinstance(column, dict):
        return column.get(key)
    return getattr(column, key, None)


def recommend_chart_configs(columns: list[Any]) -> list[dict]:
    numeric_cols = []
    date_cols = []
    category_cols = []

    for column in columns:
        col_type = _coerce_type(_get_value(column, "type"))
        if col_type == ColumnDataType.number.value:
            numeric_cols.append(column)
        elif col_type == ColumnDataType.date.value:
            date_cols.append(column)
        elif col_type in {
            ColumnDataType.enum.value,
            ColumnDataType.string.value,
            ColumnDataType.boolean.value,
        }:
            category_cols.append(column)

    configs: list[dict] = []

    for numeric in numeric_cols:
        key = _get_value(numeric, "key")
        if not key:
            continue
        configs.append({"chartType": "histogram", "xKey": key})

    for category in category_cols:
        category_key = _get_value(category, "key")
        if not category_key:
            continue
        for numeric in numeric_cols:
            numeric_key = _get_value(numeric, "key")
            if not numeric_key:
                continue
            configs.append(
                {
                    "chartType": "bar",
                    "xKey": category_key,
                    "yKeys": [numeric_key],
                }
            )

    for date_col in date_cols:
        date_key = _get_value(date_col, "key")
        if not date_key:
            continue
        for numeric in numeric_cols:
            numeric_key = _get_value(numeric, "key")
            if not numeric_key:
                continue
            configs.append(
                {
                    "chartType": "line",
                    "xKey": date_key,
                    "yKeys": [numeric_key],
                }
            )

    for idx, x_col in enumerate(numeric_cols):
        x_key = _get_value(x_col, "key")
        if not x_key:
            continue
        for y_col in numeric_cols[idx + 1:]:
            y_key = _get_value(y_col, "key")
            if not y_key:
                continue
            configs.append(
                {
                    "chartType": "scatter",
                    "xKey": x_key,
                    "yKeys": [y_key],
                }
            )

    if len(numeric_cols) >= 3:
        numeric_keys = [key for key in (_get_value(col, "key") for col in numeric_cols) if key]
        if len(numeric_keys) >= 3:
            configs.append(
                {
                    "chartType": "heatmap",
                    "xKey": numeric_keys[0],
                    "yKey": numeric_keys[1],
                    "valueKey": numeric_keys[2],
                    "numericKeys": numeric_keys,
                }
            )

    return configs
