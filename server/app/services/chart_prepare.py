from __future__ import annotations

from collections import OrderedDict
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.column_schema import ColumnSchema
from app.models.data_row import DataRow
from app.schemas.analysis_run import AnalysisFilter
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


def _coerce_type(value: Any) -> str:
    if isinstance(value, ColumnDataType):
        return value.value
    if value is None:
        return ColumnDataType.string.value
    return str(value).lower()


def _column_title_map(columns: list[ColumnSchema] | list[dict]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for column in columns:
        if isinstance(column, dict):
            key = column.get("key")
            if key:
                mapping[key] = column.get("title") or key
        else:
            mapping[column.key] = column.title
    return mapping


def _column_type_map(columns: list[ColumnSchema] | list[dict]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for column in columns:
        if isinstance(column, dict):
            key = column.get("key")
            if key:
                mapping[key] = _coerce_type(column.get("type"))
        else:
            mapping[column.key] = _coerce_type(column.type)
    return mapping


def _get_column_keys(columns: list[ColumnSchema] | list[dict], col_type: str) -> list[str]:
    keys: list[str] = []
    for column in columns:
        if isinstance(column, dict):
            key = column.get("key")
            if (
                key
                and _coerce_type(column.get("type")) == col_type
                and column.get("source_type") != "index"
            ):
                keys.append(key)
        else:
            if _coerce_type(column.type) == col_type:
                keys.append(column.key)
    return keys


def _pick_first(valid: set[str], candidates: list[str]) -> str | None:
    for key in candidates:
        if key in valid:
            return key
    return None


def _build_row_map(tidy_rows: list[dict]) -> dict[str, dict[str, dict]]:
    row_map: dict[str, dict[str, dict]] = {}
    for entry in tidy_rows:
        row_id = entry.get("_rowId")
        if not row_id:
            continue
        row_map.setdefault(row_id, {})[entry.get("columnKey")] = entry
    return row_map


def _extract_value(entry: dict | None, col_type: str) -> Any:
    if not entry or entry.get("isMissing"):
        return None
    if col_type == ColumnDataType.number.value:
        return entry.get("valueNumber")
    if col_type == ColumnDataType.boolean.value:
        return entry.get("valueBoolean")
    if col_type == ColumnDataType.date.value:
        return entry.get("valueDate")
    return entry.get("valueString")


def _build_histogram(values: list[float], bin_count: int = 10) -> tuple[list[str], list[int]]:
    if not values:
        return [], []
    min_val = min(values)
    max_val = max(values)
    if min_val == max_val:
        return [f"{min_val:.4g}"], [len(values)]
    bins = max(1, bin_count)
    step = (max_val - min_val) / bins
    counts = [0 for _ in range(bins)]
    for value in values:
        idx = int((value - min_val) / step)
        if idx >= bins:
            idx = bins - 1
        counts[idx] += 1
    labels = [
        f"{min_val + step * i:.4g}-{min_val + step * (i + 1):.4g}"
        for i in range(bins)
    ]
    return labels, counts


def prepare_chart_data(
    db: Session,
    dataset_id: str,
    chart_config: dict,
    filters: list[AnalysisFilter],
    table_id: str | None = None,
    payload: dict | None = None,
) -> tuple[dict, list[str]]:
    return _prepare_chart_data(
        db,
        dataset_id,
        chart_config,
        filters,
        table_id=table_id,
        payload=payload,
    )


def _prepare_chart_data(
    db: Session,
    dataset_id: str,
    chart_config: dict,
    filters: list[AnalysisFilter],
    table_id: str | None = None,
    payload: dict | None = None,
) -> tuple[dict, list[str]]:
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
    row_map = _build_row_map(tidy_rows)
    type_map = _column_type_map(columns)
    title_map = _column_title_map(columns)

    allowed_row_ids = _filter_rows(row_map, filters, type_map)

    chart_type = (
        chart_config.get("chartType")
        or chart_config.get("chart_type")
        or "line"
    )
    x_key = chart_config.get("xKey") or chart_config.get("x_key")
    y_keys = chart_config.get("yKeys") or chart_config.get("y_keys") or []
    group_by = chart_config.get("groupBy") or chart_config.get("group_by")
    y_key = chart_config.get("yKey") or chart_config.get("y_key")
    value_key = chart_config.get("valueKey") or chart_config.get("value_key")

    numeric_keys = _get_column_keys(columns, ColumnDataType.number.value)
    date_keys = _get_column_keys(columns, ColumnDataType.date.value)
    category_keys = (
        _get_column_keys(columns, ColumnDataType.enum.value)
        + _get_column_keys(columns, ColumnDataType.string.value)
        + _get_column_keys(columns, ColumnDataType.boolean.value)
    )

    valid_keys = set(type_map.keys())
    if x_key not in valid_keys:
        x_key = None
    y_keys = [key for key in y_keys if key in valid_keys]
    if y_key not in valid_keys:
        y_key = None
    if value_key not in valid_keys:
        value_key = None
    if group_by not in valid_keys:
        group_by = None

    x_obj: dict[str, Any] = {"key": x_key, "values": []}
    y_obj: dict[str, Any] = {"keys": y_keys}
    series: list[dict] = []

    if chart_type == "boxPlot":
        if not y_keys:
            y_keys = numeric_keys[:1]
        if not y_keys:
            return {"x": x_obj, "y": y_obj, "series": []}, allowed_row_ids

        def _compute_box(values: list[float]) -> dict:
            if not values:
                return {"min": 0, "max": 0, "q1": 0, "median": 0, "q3": 0}
            sorted_values = sorted(values)
            n = len(sorted_values)
            median = sorted_values[n // 2] if n % 2 == 1 else (
                sorted_values[n // 2 - 1] + sorted_values[n // 2]
            ) / 2
            lower = sorted_values[: n // 2]
            upper = sorted_values[(n + 1) // 2 :]
            q1 = lower[len(lower) // 2] if lower else sorted_values[0]
            q3 = upper[len(upper) // 2] if upper else sorted_values[-1]
            return {
                "min": sorted_values[0],
                "max": sorted_values[-1],
                "q1": q1,
                "median": median,
                "q3": q3,
            }

        if group_by:
            group_order: OrderedDict[str, dict[str, list[float]]] = OrderedDict()
            for row_id in allowed_row_ids:
                group_entry = row_map.get(row_id, {}).get(group_by)
                raw_group = _extract_value(group_entry, type_map.get(group_by, ""))
                group_label = "Missing" if raw_group is None else str(raw_group)
                bucket = group_order.setdefault(group_label, {key: [] for key in y_keys})
                for key in y_keys:
                    entry = row_map.get(row_id, {}).get(key)
                    value = _extract_value(entry, ColumnDataType.number.value)
                    if isinstance(value, (int, float)):
                        bucket[key].append(float(value))

            x_values = list(group_order.keys())
            x_obj = {"key": group_by, "values": x_values}
            y_obj = {"keys": y_keys}
            for key in y_keys:
                data = []
                for group_label in x_values:
                    values = group_order[group_label].get(key, [])
                    data.append(_compute_box(values))
                series.append({"name": title_map.get(key, key), "data": data})
        else:
            x_obj = {"key": "series", "values": [title_map.get(key, key) for key in y_keys]}
            y_obj = {"keys": y_keys}
            data = []
            for key in y_keys:
                values = []
                for row_id in allowed_row_ids:
                    entry = row_map.get(row_id, {}).get(key)
                    value = _extract_value(entry, ColumnDataType.number.value)
                    if isinstance(value, (int, float)):
                        values.append(float(value))
                data.append(_compute_box(values))
            series = [{"name": "boxplot", "data": data}]
    elif chart_type == "histogram":
        target_key = x_key if x_key in numeric_keys else None
        if not target_key and numeric_keys:
            target_key = numeric_keys[0]
        if not target_key:
            return {"x": x_obj, "y": y_obj, "series": []}, allowed_row_ids
        values = []
        for row_id in allowed_row_ids:
            entry = row_map.get(row_id, {}).get(target_key)
            value = _extract_value(entry, ColumnDataType.number.value)
            if isinstance(value, (int, float)):
                values.append(float(value))
        labels, counts = _build_histogram(values)
        x_obj = {"key": target_key, "values": labels}
        y_obj = {"keys": [target_key]}
        series = [
            {
                "name": title_map.get(target_key, target_key),
                "data": counts,
            }
        ]
    elif chart_type == "bar":
        group_key = x_key if x_key else _pick_first(set(category_keys), category_keys) or None
        if not group_key:
            group_key = x_key or (numeric_keys[0] if numeric_keys else None)
        if not y_keys:
            y_keys = numeric_keys[:1]
        if not group_key or not y_keys:
            return {"x": x_obj, "y": y_obj, "series": []}, allowed_row_ids

        group_order: OrderedDict[str, dict[str, list[float]]] = OrderedDict()
        for row_id in allowed_row_ids:
            group_entry = row_map.get(row_id, {}).get(group_key)
            raw_group = _extract_value(group_entry, type_map.get(group_key, ""))
            group_label = "Missing" if raw_group is None else str(raw_group)
            bucket = group_order.setdefault(group_label, {key: [] for key in y_keys})
            for key in y_keys:
                entry = row_map.get(row_id, {}).get(key)
                value = _extract_value(entry, ColumnDataType.number.value)
                if isinstance(value, (int, float)):
                    bucket[key].append(float(value))

        x_values = list(group_order.keys())
        x_obj = {"key": group_key, "values": x_values}
        y_obj = {"keys": y_keys}
        for key in y_keys:
            data = []
            for group_label in x_values:
                values = group_order[group_label].get(key, [])
                if not values:
                    data.append(0)
                else:
                    data.append(sum(values) / len(values))
            series.append({"name": title_map.get(key, key), "data": data})
    elif chart_type in {"line", "scatter"}:
        if not x_key:
            x_key = _pick_first(set(date_keys), date_keys) or _pick_first(set(numeric_keys), numeric_keys)
        if not y_keys:
            y_keys = numeric_keys[:1]
        if not x_key or not y_keys:
            return {"x": x_obj, "y": y_obj, "series": []}, allowed_row_ids

        x_type = type_map.get(x_key, ColumnDataType.string.value)
        if group_by:
            target_key = y_keys[0]
            group_order: OrderedDict[str, list[dict]] = OrderedDict()
            for row_id in allowed_row_ids:
                group_entry = row_map.get(row_id, {}).get(group_by)
                raw_group = _extract_value(group_entry, type_map.get(group_by, ""))
                group_label = "Missing" if raw_group is None else str(raw_group)
                entry_x = row_map.get(row_id, {}).get(x_key)
                entry_y = row_map.get(row_id, {}).get(target_key)
                x_val = _extract_value(entry_x, x_type)
                y_val = _extract_value(entry_y, ColumnDataType.number.value)
                if x_val is None or y_val is None:
                    continue
                group_order.setdefault(group_label, []).append({"x": x_val, "y": y_val, "_rowId": row_id})
            for group_label, points in group_order.items():
                if x_type == ColumnDataType.date.value:
                    points.sort(key=lambda item: _parse_date(item.get("x")) or datetime.min)
                else:
                    points.sort(key=lambda item: item.get("x"))
                series.append({"name": group_label, "data": points})
        else:
            for key in y_keys:
                points = []
                for row_id in allowed_row_ids:
                    entry_x = row_map.get(row_id, {}).get(x_key)
                    entry_y = row_map.get(row_id, {}).get(key)
                    x_val = _extract_value(entry_x, x_type)
                    y_val = _extract_value(entry_y, ColumnDataType.number.value)
                    if x_val is None or y_val is None:
                        continue
                    points.append({"x": x_val, "y": y_val, "_rowId": row_id})
                if x_type == ColumnDataType.date.value:
                    points.sort(key=lambda item: _parse_date(item.get("x")) or datetime.min)
                else:
                    points.sort(key=lambda item: item.get("x"))
                series.append({"name": title_map.get(key, key), "data": points})

        x_values = [point["x"] for point in (series[0]["data"] if series else [])]
        x_obj = {"key": x_key, "values": x_values}
        y_obj = {"keys": y_keys}
    elif chart_type == "heatmap":
        if not x_key:
            x_key = numeric_keys[0] if len(numeric_keys) > 0 else None
        if not y_key:
            y_key = numeric_keys[1] if len(numeric_keys) > 1 else None
        if not value_key:
            value_key = numeric_keys[2] if len(numeric_keys) > 2 else None
        if not x_key or not y_key or not value_key:
            return {"x": x_obj, "y": y_obj, "series": []}, allowed_row_ids

        points = []
        x_values = []
        y_values = []
        for row_id in allowed_row_ids:
            entry_x = row_map.get(row_id, {}).get(x_key)
            entry_y = row_map.get(row_id, {}).get(y_key)
            entry_value = row_map.get(row_id, {}).get(value_key)
            x_val = _extract_value(entry_x, ColumnDataType.number.value)
            y_val = _extract_value(entry_y, ColumnDataType.number.value)
            value = _extract_value(entry_value, ColumnDataType.number.value)
            if x_val is None or y_val is None or value is None:
                continue
            points.append({"x": x_val, "y": y_val, "value": value, "_rowId": row_id})
            x_values.append(x_val)
            y_values.append(y_val)
        x_obj = {"key": x_key, "values": sorted(set(x_values))}
        y_obj = {"key": y_key, "values": sorted(set(y_values))}
        series = [
            {
                "name": title_map.get(value_key, value_key),
                "data": points,
            }
        ]
    else:
        return _prepare_chart_data(
            db,
            dataset_id,
            {**chart_config, "chartType": "line"},
            filters,
            table_id=table_id,
            payload=payload,
        )

    return {"x": x_obj, "y": y_obj, "series": series}, allowed_row_ids
