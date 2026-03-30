from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    port: int = 8000
    database_url: str = "sqlite:///./dental_ops.db"
    vapi_base_assistant_id: str
    vapi_api_token: str | None = None
    vapi_api_base_url: str = "https://api.vapi.ai"
    seed_demo_data: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
