from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.datasets import router as datasets_router
from app.api.v1.routes.analysis import router as analysis_router
from app.api.v1.routes.charts import router as charts_router
from app.api.v1.routes.rows import router as rows_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(datasets_router)
api_router.include_router(analysis_router)
api_router.include_router(charts_router)
api_router.include_router(rows_router)
