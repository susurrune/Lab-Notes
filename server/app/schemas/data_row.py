from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DataRowCreate(BaseModel):
    """Request payload to add a data row to a dataset."""

    dataset_id: str = Field(..., description="Target dataset ID")
    values_json: dict = Field(default_factory=dict, description="Row values keyed by column key")


class DataRowOut(BaseModel):
    """Response payload for a data row."""

    id: str = Field(..., description="Row ID")
    dataset_id: str = Field(..., description="Dataset ID")
    row_id: str = Field(
        ...,
        validation_alias="row_uuid",
        serialization_alias="_rowId",
        description="Unique row UUID (_rowId)",
    )
    values_json: dict = Field(default_factory=dict, description="Row values keyed by column key")
    created_at: datetime = Field(..., description="Created timestamp")
    updated_at: datetime | None = Field(None, description="Updated timestamp")
    datasetVersion: int = Field(..., description="Dataset version")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DataRowUpsertItem(BaseModel):
    """Batch upsert row item."""

    row_id: str | None = Field(
        None,
        validation_alias="_rowId",
        serialization_alias="_rowId",
        description="Row UUID (_rowId). Auto-generated when missing.",
    )
    values_json: dict = Field(default_factory=dict, description="Row values keyed by column key")

    model_config = ConfigDict(populate_by_name=True)


class DataRowBatchUpsert(BaseModel):
    """Batch upsert payload."""

    rows: list[DataRowUpsertItem] = Field(default_factory=list, description="Rows to upsert")
