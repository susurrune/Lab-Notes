from __future__ import annotations

import uuid

from sqlalchemy import JSON, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ColumnSchema(Base):
    __tablename__ = "column_schemas"
    __table_args__ = (
        UniqueConstraint("dataset_id", "key", name="uq_column_schema_key"),
        Index("ix_column_schema_dataset", "dataset_id"),
        Index("ix_column_schema_order", "dataset_id", "order_index"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"))
    key: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(20))
    meta_json: Mapped[dict] = mapped_column(JSON, default=dict)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="columns")
