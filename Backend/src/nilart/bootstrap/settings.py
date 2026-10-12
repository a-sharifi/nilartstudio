from urllib.parse import urlsplit

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NILART_")
    environment: str = "development"
    database_url: str = "postgresql+psycopg://nilart:local-only@localhost:5432/nilart"
    redis_url: str = "redis://localhost:6379/0"
    broker_url: str = "amqp://nilart:local-only@localhost:5672//"
    public_origin: str = "http://localhost:8080"
    otp_hmac_key: SecretStr | None = None

    @model_validator(mode="after")
    def validate_origin(self):
        origin = urlsplit(self.public_origin)
        if (origin.scheme not in {"http", "https"} or not origin.hostname
                or origin.username or origin.password or origin.path or origin.query
                or origin.fragment):
            raise ValueError("public_origin must be an exact HTTP(S) origin without a path")
        if self.environment != "development" and origin.scheme != "https":
            raise ValueError("public_origin requires HTTPS outside development")
        return self


settings = Settings()
