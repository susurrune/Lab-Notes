from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = Field(default="development", alias="APP_ENV")
    database_url: str = Field(default="sqlite:///./data.db", alias="DATABASE_URL")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    app_name: str = "Lab Notes API"
    version: str = "0.1.0"
    secret_key: str = Field(
        default="lab-notes-dev-secret-key-change-in-production",
        alias="SECRET_KEY",
    )

    model_config = SettingsConfigDict(populate_by_name=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
