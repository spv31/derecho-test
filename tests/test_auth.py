import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.backend.main import app
from src.backend.core.db import Base, get_db
from src.backend.core.config import settings
from src.backend.core.models import User


TEST_DATABASE_URL = "sqlite:///data/test_database.sqlite"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def setup_settings():
    settings.google_client_id = "test-client-id"
    settings.allowed_emails = "allowed@example.com,another@example.com"
    settings.jwt_secret = "test-secret"


class TestAuthGoogle:

    def test_valid_token_allowed_email_creates_user_and_returns_token(self, client, mocker):
        mock_verify = mocker.patch("src.backend.modules.auth.router.google_id_token.verify_oauth2_token")
        mock_verify.return_value = {
            "sub": "google-sub-123",
            "email": "allowed@example.com",
            "name": "Allowed User",
        }

        resp = client.post("/api/auth/google", json={"id_token": "valid-token"})

        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert len(data["token"]) > 0

        db = TestSessionLocal()
        user = db.query(User).filter(User.google_sub == "google-sub-123").first()
        assert user is not None
        assert user.email == "allowed@example.com"
        assert user.name == "Allowed User"
        db.close()

    def test_valid_token_allowed_email_reuses_existing_user(self, client, mocker):
        from datetime import datetime, timezone

        db = TestSessionLocal()
        existing = User(
            google_sub="google-sub-456",
            email="another@example.com",
            name="Existing User",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(existing)
        db.commit()
        existing_id = existing.id
        db.close()

        mock_verify = mocker.patch("src.backend.modules.auth.router.google_id_token.verify_oauth2_token")
        mock_verify.return_value = {
            "sub": "google-sub-456",
            "email": "another@example.com",
            "name": "Existing User",
        }

        resp = client.post("/api/auth/google", json={"id_token": "valid-token"})

        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data

        db = TestSessionLocal()
        users = db.query(User).filter(User.google_sub == "google-sub-456").all()
        assert len(users) == 1
        assert users[0].id == existing_id
        db.close()

    def test_valid_token_email_not_in_allowlist_returns_403(self, client, mocker):
        mock_verify = mocker.patch("src.backend.modules.auth.router.google_id_token.verify_oauth2_token")
        mock_verify.return_value = {
            "sub": "google-sub-789",
            "email": "unknown@example.com",
            "name": "Unknown User",
        }

        resp = client.post("/api/auth/google", json={"id_token": "valid-token"})

        assert resp.status_code == 403
        assert resp.json()["detail"] == "Email not in allowlist"

    def test_invalid_token_returns_401(self, client, mocker):
        mock_verify = mocker.patch("src.backend.modules.auth.router.google_id_token.verify_oauth2_token")
        mock_verify.side_effect = ValueError("Invalid token")

        resp = client.post("/api/auth/google", json={"id_token": "invalid-token"})

        assert resp.status_code == 401
        assert "Invalid or expired" in resp.json()["detail"]


class TestAuthDependencies:

    def test_protected_endpoint_without_auth_returns_401(self, client):
        resp = client.get("/api/subjects")
        assert resp.status_code == 401

    def test_protected_endpoint_with_invalid_token_returns_401(self, client):
        resp = client.get("/api/subjects", headers={"Authorization": "Bearer invalid-token"})
        assert resp.status_code == 401

    def test_protected_endpoint_with_valid_token_passes_auth(self, client, mocker):
        from datetime import datetime, timedelta, timezone
        from jose import jwt

        db = TestSessionLocal()
        user = User(
            google_sub="google-sub-valid",
            email="allowed@example.com",
            name="Valid User",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(user)
        db.commit()
        user_id = user.id
        db.close()

        token = jwt.encode(
            {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            settings.jwt_secret,
            algorithm="HS256",
        )

        resp = client.get("/api/subjects", headers={"Authorization": f"Bearer {token}"})

        assert resp.status_code != 401