from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional, get_current_user, get_db
from app.models.user import User
from app.schemas.dataset import DatasetCreate, DatasetOut
from app.services.dataset import (
    create_dataset,
    delete_dataset,
    get_dataset,
    list_datasets,
    update_dataset,
)
from app.utils.response_v1 import ok

router = APIRouter(prefix="/datasets", tags=["datasets"])


def _resolve_owner_id(payload_owner_id: str | None, current_user: User | None) -> str | None:
    if current_user:
        return current_user.id
    return payload_owner_id


@router.post("", status_code=status.HTTP_201_CREATED)
def create_dataset_handler(
    payload: DatasetCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    owner_id = _resolve_owner_id(payload.owner_id, current_user)
    payload_dict = payload.model_dump(by_alias=True)
    payload_dict["ownerId"] = owner_id
    create_payload = DatasetCreate.model_validate(payload_dict)
    record = create_dataset(db, create_payload)
    data = DatasetOut.model_validate(record).model_dump(mode="json", by_alias=True)
    return ok(
        data,
        request,
        status_code=status.HTTP_201_CREATED,
        meta={"datasetVersion": record.version},
    )


@router.get("")
def list_datasets_handler(
    request: Request,
    db: Session = Depends(get_db),
    owner_id: str | None = Query(None, alias="ownerId"),
    current_user: User | None = Depends(get_current_user_optional),
):
    resolved_owner = current_user.id if current_user else owner_id
    records = list_datasets(db, resolved_owner)
    data = [DatasetOut.model_validate(item).model_dump(mode="json", by_alias=True) for item in records]
    version = max((item.version for item in records), default=0)
    return ok(data, request, meta={"datasetVersion": version})


@router.get("/{dataset_id}")
def get_dataset_handler(
    dataset_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    record = get_dataset(db, dataset_id)
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if current_user and record.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    data = DatasetOut.model_validate(record).model_dump(mode="json", by_alias=True)
    return ok(data, request, meta={"datasetVersion": record.version})


@router.put("/{dataset_id}")
def update_dataset_handler(
    dataset_id: str,
    payload: DatasetCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    record = get_dataset(db, dataset_id)
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if current_user and record.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    owner_id = _resolve_owner_id(payload.owner_id, current_user)
    payload_dict = payload.model_dump(by_alias=True)
    payload_dict["ownerId"] = owner_id
    update_payload = DatasetCreate.model_validate(payload_dict)

    updated = update_dataset(db, record, update_payload)
    data = DatasetOut.model_validate(updated).model_dump(mode="json", by_alias=True)
    return ok(data, request, meta={"datasetVersion": updated.version})


@router.delete("/{dataset_id}")
def delete_dataset_handler(
    dataset_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    record = get_dataset(db, dataset_id)
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if current_user and record.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    version = record.version
    delete_dataset(db, record)
    return ok({"deleted": True, "id": dataset_id}, request, meta={"datasetVersion": version})
