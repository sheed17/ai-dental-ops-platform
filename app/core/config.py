from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    port: int = 8000
    frontend_base_url: str = "http://localhost:3000"
    database_url: str = "sqlite:///./dental_ops.db"
    vapi_base_assistant_id: str
    vapi_api_token: str | None = None
    vapi_api_base_url: str = "https://api.vapi.ai"
    vapi_webhook_secret: str | None = None
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_messaging_service_sid: str | None = None
    twilio_from_number: str | None = None
    slack_webhook_url: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_from_email: str | None = None
    automation_poll_interval_seconds: int = 60
    automation_run_on_startup: bool = True
    seed_demo_data: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
