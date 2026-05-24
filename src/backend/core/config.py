from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    nan_api_key: str = Field(default="", validate_default=True)
    nan_api_base_url: str = "https://api.nan.builders/v1"
    jwt_secret: str = Field(default="", validate_default=True)
    google_client_id: str = Field(default="", validate_default=True)
    allowed_emails: str = ""

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v or v == "change-me":
            raise ValueError("jwt_secret must be set and not be 'change-me'")
        return v

    @field_validator("nan_api_key")
    @classmethod
    def validate_nan_api_key(cls, v: str) -> str:
        if not v:
            raise ValueError("nan_api_key must be set")
        return v

    @field_validator("google_client_id")
    @classmethod
    def validate_google_client_id(cls, v: str) -> str:
        if not v:
            raise ValueError("google_client_id must be set")
        return v

    @property
    def allowed_emails_list(self) -> List[str]:
        if not self.allowed_emails:
            return []
        return [e.strip() for e in self.allowed_emails.split(",") if e.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()