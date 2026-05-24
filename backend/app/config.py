from __future__ import annotations

from functools import lru_cache

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = Field(default="Employed API", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=False, alias="DEBUG")
    secret_key: str = Field(default="change-me", alias="SECRET_KEY")
    database_url: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/employed",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    alembic_database_url: str | None = Field(default=None, alias="ALEMBIC_DATABASE_URL")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    @computed_field(return_type=str)
    @property
    def sync_database_url(self) -> str:
        return self.database_url

    @computed_field(return_type=str)
    @property
    def async_database_url(self) -> str:
        if self.database_url.startswith("postgresql+psycopg2://"):
            return self.database_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.database_url

    @property
    def migration_database_url(self) -> str:
        return self.alembic_database_url or self.sync_database_url


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
