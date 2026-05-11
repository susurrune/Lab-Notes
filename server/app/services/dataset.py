from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.schemas.dataset import DatasetCreate
from app.utils.versioning import DatasetChangeType, increment_dataset_version


def create_dataset(db: Session, payload: DatasetCreate) -> Dataset:
    dataset = Dataset(
        id=payload.id or None,
        owner_id=payload.owner_id,
        name=payload.name,
        payload_json=payload.payload_json or {},
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


def list_datasets(db: Session, owner_id: str | None = None) -> list[Dataset]:
    query = db.query(Dataset)
    if owner_id:
        query = query.filter(Dataset.owner_id == owner_id)
    return query.order_by(Dataset.created_at.desc()).all()


def get_dataset(db: Session, dataset_id: str) -> Dataset | None:
    return db.query(Dataset).filter(Dataset.id == dataset_id).first()


def update_dataset(db: Session, dataset: Dataset, payload: DatasetCreate) -> Dataset:
    changed = False
    if payload.name and payload.name != dataset.name:
        dataset.name = payload.name
        changed = True
    if payload.owner_id is not None and payload.owner_id != dataset.owner_id:
        dataset.owner_id = payload.owner_id
        changed = True
    if payload.payload_json is not None and payload.payload_json != dataset.payload_json:
        dataset.payload_json = payload.payload_json
        changed = True

    if changed:
        dataset.version += 1
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


def delete_dataset(db: Session, dataset: Dataset) -> None:
    db.delete(dataset)
    db.commit()


def bump_dataset_version(
    db: Session,
    dataset: Dataset,
    change_type: DatasetChangeType = DatasetChangeType.rows,
) -> Dataset:
    return increment_dataset_version(db, dataset, change_type)
