from __future__ import annotations

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.chart_config import ChartConfig
from app.models.column_schema import ColumnSchema
from app.models.data_row import DataRow
from app.models.dataset import Dataset
from app.utils.versioning import DatasetChangeType, increment_dataset_version


def seed_demo() -> None:
    init_db()
    db = SessionLocal()
    try:
        existing = db.query(Dataset).filter(Dataset.name == "Demo Dataset").first()
        if existing:
            print(f"Dataset already exists: {existing.id}")
            return

        dataset = Dataset(name="Demo Dataset")
        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        columns = [
            ColumnSchema(
                dataset_id=dataset.id,
                key="sample_id",
                title="Sample ID",
                type="string",
                meta_json={"required": True},
                order_index=0,
            ),
            ColumnSchema(
                dataset_id=dataset.id,
                key="group",
                title="Group",
                type="enum",
                meta_json={"values": ["Control", "Treatment A", "Treatment B"]},
                order_index=1,
            ),
            ColumnSchema(
                dataset_id=dataset.id,
                key="measured_at",
                title="Measured At",
                type="date",
                meta_json={},
                order_index=2,
            ),
            ColumnSchema(
                dataset_id=dataset.id,
                key="temperature",
                title="Temperature",
                type="number",
                meta_json={"unit": "C"},
                order_index=3,
            ),
            ColumnSchema(
                dataset_id=dataset.id,
                key="ph",
                title="pH",
                type="number",
                meta_json={},
                order_index=4,
            ),
            ColumnSchema(
                dataset_id=dataset.id,
                key="alive",
                title="Alive",
                type="boolean",
                meta_json={},
                order_index=5,
            ),
        ]
        db.add_all(columns)
        db.commit()
        increment_dataset_version(db, dataset, DatasetChangeType.schema)

        rows = [
            DataRow(
                dataset_id=dataset.id,
                values_json={
                    "sample_id": "S-001",
                    "group": "Control",
                    "measured_at": "2026-01-01",
                    "temperature": 36.8,
                    "ph": 7.2,
                    "alive": True,
                },
            ),
            DataRow(
                dataset_id=dataset.id,
                values_json={
                    "sample_id": "S-002",
                    "group": "Treatment A",
                    "measured_at": "2026-01-02",
                    "temperature": 37.1,
                    "ph": 7.1,
                    "alive": True,
                },
            ),
            DataRow(
                dataset_id=dataset.id,
                values_json={
                    "sample_id": "S-003",
                    "group": "Treatment B",
                    "measured_at": "2026-01-03",
                    "temperature": 38.0,
                    "ph": 6.9,
                    "alive": False,
                },
            ),
            DataRow(
                dataset_id=dataset.id,
                values_json={
                    "sample_id": "S-004",
                    "group": "Control",
                    "measured_at": "2026-01-04",
                    "temperature": 36.5,
                    "ph": 7.3,
                    "alive": True,
                },
            ),
        ]
        db.add_all(rows)
        db.commit()
        increment_dataset_version(db, dataset, DatasetChangeType.rows)

        charts = [
            ChartConfig(
                dataset_id=dataset.id,
                config_json={
                    "chartType": "line",
                    "xKey": "measured_at",
                    "yKeys": ["temperature", "ph"],
                },
            ),
            ChartConfig(
                dataset_id=dataset.id,
                config_json={
                    "chartType": "bar",
                    "xKey": "group",
                    "yKeys": ["temperature"],
                },
            ),
        ]
        db.add_all(charts)
        db.commit()

        print(f"Seeded demo dataset: {dataset.id} (version {dataset.version})")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
