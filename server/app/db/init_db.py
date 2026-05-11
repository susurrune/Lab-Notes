from app.db.base import Base
from app.db.session import engine
from app.models import chart_config, column_schema, data_row, dataset, user


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
