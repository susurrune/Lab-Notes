from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChartConfigCreate(BaseModel):
    """Request payload to create a chart config for a dataset."""

    dataset_id: str = Field(..., description="Target dataset ID")
    config_json: dict = Field(default_factory=dict, description="Chart configuration")


class ChartConfigOut(BaseModel):
    """Response payload for a chart config."""

    id: str = Field(..., description="Chart config ID")
    dataset_id: str = Field(..., description="Dataset ID")
    config_json: dict = Field(default_factory=dict, description="Chart configuration")
    created_at: datetime = Field(..., description="Created timestamp")
    updated_at: datetime | None = Field(None, description="Updated timestamp")
    datasetVersion: int = Field(..., description="Dataset version")

    model_config = ConfigDict(from_attributes=True)
