from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class MetricType(str, Enum):
    count = "count"
    sum = "sum"
    avg = "avg"
    min = "min"
    max = "max"


class FilterOp(str, Enum):
    eq = "eq"
    neq = "neq"
    gt = "gt"
    gte = "gte"
    lt = "lt"
    lte = "lte"
    contains = "contains"


class AnalysisFilter(BaseModel):
    columnKey: str = Field(..., description="Column key to filter")
    op: FilterOp = Field(FilterOp.eq, description="Filter operator")
    value: Any = Field(..., description="Filter value")


class AnalysisRunRequest(BaseModel):
    filters: list[AnalysisFilter] = Field(default_factory=list, description="Filter conditions")
    groupBy: str | None = Field(None, description="Optional group-by column key")
    metrics: list[MetricType] = Field(default_factory=list, description="Aggregate metrics")
    tableId: str | None = Field(None, description="Optional table id from dataset payload")


class AnalysisRunResponse(BaseModel):
    result: list[dict] = Field(default_factory=list, description="Aggregated table")
    rowIds: list[str] = Field(default_factory=list, description="Row ids used for analysis")
    datasetVersion: int = Field(..., description="Dataset version")
