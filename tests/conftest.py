import os

import pytest
from fastapi.testclient import TestClient

# Set required secrets before any module loads Settings()
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("NAN_API_KEY", "test-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")

from src.backend.main import app, clear_rate_limit_history


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    clear_rate_limit_history()


@pytest.fixture
def client():
    return TestClient(app)