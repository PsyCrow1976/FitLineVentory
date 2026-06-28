from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://fitlineventory:fitlineventory@db:5432/fitlineventory"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080
    admin_username: str = "admin"
    admin_password: str = "admin"
    cors_origins: str = "http://localhost:8080,http://192.168.1.130:8080"
    reorder_lookback_days: int = 30
    image_storage_path: str = "/app/data/images"
    scrape_user_agent: str = "FitLineVentory/0.2 (+personal inventory; admin scrape)"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()