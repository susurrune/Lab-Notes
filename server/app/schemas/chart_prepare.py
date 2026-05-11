from __future__ import annotations

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from app.schemas.analysis_run import AnalysisFilter


class ChartPrepareRequest(BaseModel):
    chart_config: dict = Field(
        default_factory=dict,
        validation_alias=AliasChoices("chartConfig", "config", "config_json"),
        description="Chart configuration",
    )
    filters: list[AnalysisFilter] = Field(default_factory=list, description="Filter conditions")

    model_config = ConfigDict(populate_by_name=True)


class ChartPrepareResponse(BaseModel):
    x: dict = Field(default_factory=dict, description="X axis payload")
    y: dict = Field(default_factory=dict, description="Y axis payload")
    series: list[dict] = Field(default_factory=list, description="Series payload")
    rowIds: list[str] = Field(default_factory=list, description="Row ids used for chart")
    datasetVersion: int = Field(..., description="Dataset version")
