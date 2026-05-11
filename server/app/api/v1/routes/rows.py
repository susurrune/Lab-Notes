from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.data_row import DataRowBatchUpsert, DataRowOut
from app.services.data_row import batch_upsert_rows, list_rows
from app.services.dataset import bump_dataset_version, get_dataset
from app.utils.versioning import DatasetChangeType
from app.utils.response_v1 import ok

router = APIRouter(prefix="/datasets/{dataset_id}/rows", tags=["rows"])


def _parse_filters(raw_filters: list[str]) -> list[tuple[str, str]]:
    parsed: list[tuple[str, str]] = []
    for raw in raw_filters:
        if ":" in raw:
            key, value = raw.split(":", 1)
        elif "=" in raw:
            key, value = raw.split("=", 1)
        else:
            continue
        key = key.strip()
        value = value.strip()
        if key:
            parsed.append((key, value))
    return parsed


def _value_matches(cell: Any, expected: str) -> bool:
    if isinstance(cell, bool):
        return expected.lower() in {"true", "1"} if cell else expected.lower() in {"false", "0"}
    if isinstance(cell, (int, float)):
        try:
            return float(cell) == float(expected)
        except ValueError:
            return False
    if cell is None:
        return expected == ""
    return str(cell) == expected


def _row_matches(row_values: dict, row_uuid: str, filters: list[tuple[str, str]]) -> bool:
    for key, value in filters:
        if key in {"_rowId", "row_id", "rowId"}:
            if not _value_matches(row_uuid, value):
                return False
            continue
        if key not in row_values:
            return False
        if not _value_matches(row_values.get(key), value):
            return False
    return True


def _serialize_row(row, dataset_version: int) -> dict:
    payload = {
        "id": row.id,
        "dataset_id": row.dataset_id,
        "row_uuid": row.row_uuid,
        "values_json": row.values_json or {},
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "datasetVersion": dataset_version,
    }
    return DataRowOut.model_validate(payload).model_dump(mode="json", by_alias=True)


@router.post(":batchUpsert", status_code=status.HTTP_200_OK)
def batch_upsert_rows_handler(
    dataset_id: str,
    payload: DataRowBatchUpsert,
    request: Request,
    db: Session = Depends(get_db),
):
    dataset = get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    rows = batch_upsert_rows(db, dataset, payload.rows)
    if rows:
        dataset = bump_dataset_version(db, dataset, DatasetChangeType.rows)

    data = {
        "items": [_serialize_row(row, dataset.version) for row in rows],
        "datasetVersion": dataset.version,
    }
    return ok(
        data,
        request,
        status_code=status.HTTP_200_OK,
        meta={"datasetVersion": dataset.version},
    )


@router.get("")
def list_rows_handler(
    dataset_id: str,
    request: Request,
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200, description="Max rows to return"),
    offset: int = Query(0, ge=0, description="Offset into result set"),
    filter: list[str] = Query(default=[], description="Filter as key=value or key:value"),
):
    dataset = get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    rows = list_rows(db, dataset_id)
    parsed_filters = _parse_filters(filter)
    if parsed_filters:
        rows = [
            row
            for row in rows
            if _row_matches(row.values_json or {}, row.row_uuid, parsed_filters)
        ]

    total = len(rows)
    page_rows = rows[offset: offset + limit]

    data = {
        "items": [_serialize_row(row, dataset.version) for row in page_rows],
        "total": total,
        "limit": limit,
        "offset": offset,
        "datasetVersion": dataset.version,
    }
    return ok(data, request, meta={"datasetVersion": dataset.version})
