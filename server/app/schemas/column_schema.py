from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ColumnDataType(str, Enum):
    """Allowed column data types for schema."""

    number = "number"
    string = "string"
    date = "date"
    enum = "enum"
    boolean = "boolean"
    file = "file"


class ColumnSchemaCreate(BaseModel):
    """Request payload to add a column schema to a dataset."""

    dataset_id: str = Field(..., description="Target dataset ID")
    key: str = Field(..., description="Internal unique key")
    title: str = Field(..., description="Display title")
    type: ColumnDataType = Field(..., description="Column data type")
    meta_json: dict = Field(default_factory=dict, description="Column metadata")
    order_index: int = Field(0, description="Column order index")


class ColumnSchemaOut(BaseModel):
    """Response payload for a column schema."""

    id: str = Field(..., description="Column schema ID")
    dataset_id: str = Field(..., description="Dataset ID")
    key: str = Field(..., description="Internal unique key")
    title: str = Field(..., description="Display title")
    type: ColumnDataType = Field(..., description="Column data type")
    meta_json: dict = Field(default_factory=dict, description="Column metadata")
    order_index: int = Field(..., description="Column order index")
    datasetVersion: int = Field(..., description="Dataset version")

    model_config = ConfigDict(from_attributes=True)
