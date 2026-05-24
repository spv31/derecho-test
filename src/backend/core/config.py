from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    nan_api_key: str = ""
    nan_api_base_url: str = "https://api.nan.builders/v1"
    jwt_secret: str = "change-me"
    google_client_id: str = ""
    allowed_emails: str = ""

    @property
    def allowed_emails_list(self) -> List[str]:
        if not self.allowed_emails:
            return []
        return [e.strip() for e in self.allowed_emails.split(",") if e.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()