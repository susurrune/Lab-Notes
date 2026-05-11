from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.chart_prepare import ChartPrepareRequest, ChartPrepareResponse
from app.schemas.chart_recommend import ChartRecommendItem, ChartRecommendResponse
from app.services.payload_tables import extract_payload_columns
from app.services.chart_prepare import prepare_chart_data
from app.services.chart_recommend import recommend_chart_configs
from app.services.dataset import get_dataset
from app.utils.response_v1 import ok

router = APIRouter(prefix="/datasets/{dataset_id}/charts", tags=["charts"])


@router.get("/recommend")
def recommend_charts_handler(
    dataset_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    dataset = get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    payload_columns = extract_payload_columns(dataset.payload_json)
    source_columns = payload_columns or dataset.columns
    configs = recommend_chart_configs(source_columns)
    items = [ChartRecommendItem(config_json=config) for config in configs]
    data = ChartRecommendResponse(items=items, datasetVersion=dataset.version).model_dump(mode="json")
    return ok(data, request, meta={"datasetVersion": dataset.version})


@router.post("/prepare")
def prepare_chart_handler(
    dataset_id: str,
    payload: ChartPrepareRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    dataset = get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    table_id = payload.chart_config.get("tableId") or payload.chart_config.get("table_id")
    data_payload, row_ids = prepare_chart_data(
        db,
        dataset_id,
        payload.chart_config,
        payload.filters,
        table_id=table_id,
        payload=dataset.payload_json,
    )
    data = ChartPrepareResponse(
        x=data_payload.get("x", {}),
        y=data_payload.get("y", {}),
        series=data_payload.get("series", []),
        rowIds=row_ids,
        datasetVersion=dataset.version,
    ).model_dump(mode="json")
    return ok(data, request, meta={"datasetVersion": dataset.version})
