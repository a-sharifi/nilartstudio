from typing import Literal
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
    dev_mode: bool = False
    fake_sms: bool = False
    basalam_enabled: bool = False
    basalam_token: SecretStr | None = None
    basalam_webhook_secret: SecretStr | None = None
    tapin_enabled: bool = False
    tapin_token: SecretStr | None = None
    tapin_shop_id: str = ""
    payment_mode: Literal["disabled", "zarinpal_sandbox", "zibal_sandbox"] = "disabled"
    zarinpal_merchant_id: str = "00000000-0000-0000-0000-000000000000"
    zibal_merchant_id: str = "zibal"
    sms_mode: Literal["disabled", "sandbox", "kavenegar"] = "disabled"

    kavenegar_api_key: SecretStr | None = None
    kavenegar_template_login: str = "nilartlogin"
    kavenegar_template_register: str = "nilartregister"
    kavenegar_template_recovery: str = "nilartrecovery"
    kavenegar_template_phone_change: str = "nilartphonechange"
    kavenegar_template_purchase: str = "nilartpurchase"
    kavenegar_template_shipped: str = "nilartshipped"
    order_sms_enabled: bool = False
    # Explicit gate: only names independently confirmed as approved may send.
    kavenegar_approved_templates: str = ""

    @model_validator(mode="after")
    def validate_origin(self):
        if self.dev_mode and self.environment != "development":
            raise ValueError("Development mode is permitted only in development")
        if self.fake_sms:
            self.sms_mode = "sandbox"
        if self.sms_mode == "sandbox" and self.environment != "development":
            raise ValueError("Sandbox SMS is permitted only in development")
        if self.payment_mode in {"zarinpal_sandbox", "zibal_sandbox"} and self.environment != "development":
            raise ValueError("Sandbox payment is permitted only in development")
        if self.payment_mode == "zibal_sandbox" and self.zibal_merchant_id != "zibal":
            raise ValueError(
                "Zibal sandbox requires merchant zibal; live activation must be explicit"
            )
        if self.sms_mode == "kavenegar" and not self.kavenegar_api_key:
            raise ValueError("Kavenegar API key is required for real SMS")
        origin = urlsplit(self.public_origin)
        if (
            origin.scheme not in {"http", "https"}
            or not origin.hostname
            or origin.username
            or origin.password
            or origin.path
            or origin.query
            or origin.fragment
        ):
            raise ValueError("public_origin must be an exact HTTP(S) origin without a path")
        if self.environment != "development" and origin.scheme != "https":
            raise ValueError("public_origin requires HTTPS outside development")
        return self


settings = Settings()
