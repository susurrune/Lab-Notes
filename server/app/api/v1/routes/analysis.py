from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.analysis_run import AnalysisRunRequest, AnalysisRunResponse
from app.services.analysis_v1 import run_analysis
from app.services.payload_tables import extract_payload_columns
from app.services.dataset import get_dataset
from app.utils.response_v1 import ok

router = APIRouter(prefix="/datasets/{dataset_id}/analysis", tags=["analysis"])


@router.post("/run")
def run_analysis_handler(
    dataset_id: str,
    payload: AnalysisRunRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    dataset = get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if payload.groupBy:
        payload_columns = extract_payload_columns(dataset.payload_json, payload.tableId)
        column_keys = (
            {column.key for column in dataset.columns}
            if dataset.columns
            else {column.get("key") for column in payload_columns}
        )
        if payload.groupBy not in column_keys:
            raise HTTPException(status_code=400, detail="groupBy column not found")

    result, row_ids = run_analysis(
        db,
        dataset_id,
        payload.filters,
        payload.groupBy,
        payload.metrics,
        table_id=payload.tableId,
        payload=dataset.payload_json,
    )

    data = AnalysisRunResponse(
        result=result,
        rowIds=row_ids,
        datasetVersion=dataset.version,
    ).model_dump(mode="json")
    return ok(data, request, meta={"datasetVersion": dataset.version})
