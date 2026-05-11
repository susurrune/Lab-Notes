from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DatasetCreate(BaseModel):
    """Request payload to create or update a dataset."""

    id: str | None = Field(None, description="Dataset ID (optional)")
    owner_id: str | None = Field(
        None,
        description="Owner user ID",
        validation_alias="ownerId",
        serialization_alias="ownerId",
    )
    name: str = Field(..., description="Dataset name")
    payload_json: dict = Field(
        default_factory=dict,
        description="Custom payload stored with the dataset",
        validation_alias="payload",
        serialization_alias="payload",
    )

    model_config = ConfigDict(populate_by_name=True)


class DatasetOut(BaseModel):
    """Response payload for a dataset."""

    id: str = Field(..., description="Dataset ID")
    owner_id: str | None = Field(
        None,
        description="Owner user ID",
        serialization_alias="ownerId",
        validation_alias="ownerId",
    )
    name: str = Field(..., description="Dataset name")
    payload_json: dict = Field(
        default_factory=dict,
        description="Custom payload",
        serialization_alias="payload",
    )
    datasetVersion: int = Field(
        ..., validation_alias="version", description="Dataset version"
    )
    created_at: datetime = Field(..., description="Created timestamp")
    updated_at: datetime | None = Field(None, description="Updated timestamp")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
