from __future__ import annotations

from pydantic import BaseModel, Field


class ChartRecommendItem(BaseModel):
    config_json: dict = Field(default_factory=dict, description="Chart configuration")


class ChartRecommendResponse(BaseModel):
    items: list[ChartRecommendItem] = Field(default_factory=list, description="Chart configs")
    datasetVersion: int = Field(..., description="Dataset version")
