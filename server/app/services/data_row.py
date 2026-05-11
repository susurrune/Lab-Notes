from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.data_row import DataRow
from app.models.dataset import Dataset
from app.schemas.data_row import DataRowUpsertItem


def batch_upsert_rows(
    db: Session,
    dataset: Dataset,
    items: list[DataRowUpsertItem],
) -> list[DataRow]:
    if not items:
        return []

    requested_ids = [item.row_id for item in items if item.row_id]
    existing = {}
    if requested_ids:
        rows = (
            db.query(DataRow)
            .filter(DataRow.dataset_id == dataset.id, DataRow.row_uuid.in_(requested_ids))
            .all()
        )
        existing = {row.row_uuid: row for row in rows}

    results: list[DataRow] = []
    for item in items:
        if item.row_id and item.row_id in existing:
            row = existing[item.row_id]
            row.values_json = item.values_json
        elif item.row_id:
            row = DataRow(
                dataset_id=dataset.id,
                row_uuid=item.row_id,
                values_json=item.values_json,
            )
            db.add(row)
        else:
            row = DataRow(dataset_id=dataset.id, values_json=item.values_json)
            db.add(row)
        results.append(row)

    db.commit()
    for row in results:
        db.refresh(row)
    return results


def list_rows(db: Session, dataset_id: str) -> list[DataRow]:
    return (
        db.query(DataRow)
        .filter(DataRow.dataset_id == dataset_id)
        .order_by(DataRow.created_at.asc())
        .all()
    )
