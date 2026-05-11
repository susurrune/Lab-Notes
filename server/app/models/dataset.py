from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    name: Mapped[str] = mapped_column(String(200))
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    columns: Mapped[list["ColumnSchema"]] = relationship(
        "ColumnSchema",
        back_populates="dataset",
        cascade="all, delete-orphan",
        order_by="ColumnSchema.order_index",
    )
    rows: Mapped[list["DataRow"]] = relationship(
        "DataRow",
        back_populates="dataset",
        cascade="all, delete-orphan",
        order_by="DataRow.created_at",
    )
    charts: Mapped[list["ChartConfig"]] = relationship(
        "ChartConfig",
        back_populates="dataset",
        cascade="all, delete-orphan",
    )
