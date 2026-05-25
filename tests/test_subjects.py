import pytest
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from src.backend.main import app
from src.backend.core.db import Base, get_db
from src.backend.core.models import User, Subject
from src.backend.modules.auth.dependencies import get_current_user

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

fake_user = User(id="user-1", google_sub="sub-1", email="test@test.com", name="Test", created_at="2024-01-01")


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_current_user():
    return fake_user


@contextmanager
def use_subjects_overrides():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    try:
        yield
    finally:
        del app.dependency_overrides[get_db]
        del app.dependency_overrides[get_current_user]


class TestSubjects:

    def setup_method(self):
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        db.add(User(id="user-1", google_sub="sub-1", email="test@test.com", name="Test", created_at="2024-01-01"))
        db.commit()
        db.close()

    def teardown_method(self):
        Base.metadata.drop_all(bind=engine)

    def test_create_subject(self, client):
        with use_subjects_overrides():
            resp = client.post("/api/subjects", json={"name": "Math"}, headers={"Authorization": "Bearer test"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Math"
        assert "id" in data
        assert "created_at" in data

    def test_list_subjects_only_own(self, client):
        with use_subjects_overrides():
            client.post("/api/subjects", json={"name": "Math"}, headers={"Authorization": "Bearer test"})
        db = TestingSessionLocal()
        db.add(User(id="user-2", google_sub="sub-2", email="other@test.com", name="Other", created_at="2024-01-01"))
        db.add(Subject(id="sub-other", user_id="user-2", name="Physics", created_at="2024-01-01"))
        db.commit()
        db.close()
        with use_subjects_overrides():
            resp = client.get("/api/subjects", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Math"

    def test_delete_own_subject(self, client):
        with use_subjects_overrides():
            resp = client.post("/api/subjects", json={"name": "Math"}, headers={"Authorization": "Bearer test"})
            subject_id = resp.json()["id"]
            resp = client.delete(f"/api/subjects/{subject_id}", headers={"Authorization": "Bearer test"})
            assert resp.status_code == 204
            resp = client.get("/api/subjects", headers={"Authorization": "Bearer test"})
            assert len(resp.json()) == 0

    def test_delete_other_users_subject_returns_404(self, client):
        db = TestingSessionLocal()
        db.add(User(id="user-2", google_sub="sub-2", email="other@test.com", name="Other", created_at="2024-01-01"))
        db.add(Subject(id="sub-other", user_id="user-2", name="Physics", created_at="2024-01-01"))
        db.commit()
        db.close()
        with use_subjects_overrides():
            resp = client.delete("/api/subjects/sub-other", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 404

    def test_rename_subject(self, client):
        with use_subjects_overrides():
            resp = client.post("/api/subjects", json={"name": "Math"}, headers={"Authorization": "Bearer test"})
            subject_id = resp.json()["id"]
            res = client.patch(f"/api/subjects/{subject_id}", json={"name": "Matemáticas"})
            assert res.status_code == 200
            data = res.json()
            assert data["name"] == "Matemáticas"
            assert data["id"] == subject_id
            listing = client.get("/api/subjects")
            assert listing.json()[0]["name"] == "Matemáticas"

    def test_rename_subject_empty_name_422(self, client):
        with use_subjects_overrides():
            resp = client.post("/api/subjects", json={"name": "Math"}, headers={"Authorization": "Bearer test"})
            subject_id = resp.json()["id"]
            res = client.patch(f"/api/subjects/{subject_id}", json={"name": "   "})
            assert res.status_code == 422

    def test_rename_subject_other_user_404(self, client):
        db = TestingSessionLocal()
        db.add(User(id="user-2", google_sub="sub-2", email="other@test.com", name="Other", created_at="2024-01-01"))
        db.add(Subject(id="sub-other", user_id="user-2", name="Physics", created_at="2024-01-01"))
        db.commit()
        db.close()
        with use_subjects_overrides():
            res = client.patch("/api/subjects/sub-other", json={"name": "Hacked"})
            assert res.status_code == 404

    def test_rename_nonexistent_subject_404(self, client):
        with use_subjects_overrides():
            res = client.patch("/api/subjects/nonexistent", json={"name": "X"})
            assert res.status_code == 404