import json
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.backend.main import app
from src.backend.core.db import Base, get_db
from src.backend.core.models import Document, Subject, Summary, User
from src.backend.modules.auth.dependencies import get_current_user

SAMPLE_SUMMARY_PAYLOAD = {
    "title": "Resumen de Derecho Civil: Personas y Capacidad",
    "content": (
        "## Introducción\n\n"
        "Este resumen aborda los conceptos básicos de **personalidad jurídica** "
        "y **capacidad de obrar** según el material proporcionado.\n\n"
        "## La personalidad jurídica\n\n"
        "La *personalidad* se adquiere con el nacimiento conforme al artículo "
        "`30 CC`. Sus características son:\n\n"
        "- Universal\n"
        "- Irrenunciable\n"
        "- Indisponible\n\n"
        "### Excepciones\n\n"
        "El material señala excepciones específicas para determinados supuestos."
    ),
}


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_current_user():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.id == "user-1").first()
    db.close()
    return user


def seed_basic():
    db = TestingSessionLocal()
    db.add(User(id="user-1", google_sub="sub-1", email="u@test.com", name="U", created_at="2024-01-01"))
    db.add(Subject(id="subj-1", user_id="user-1", name="Civil", created_at="2024-01-01"))
    db.add(Document(
        id="doc-1", subject_id="subj-1", filename="apuntes.pdf",
        status="ready", raw_text="Material sobre personalidad jurídica.",
        char_count=37, created_at="2024-01-01",
    ))
    db.add(Document(
        id="doc-2", subject_id="subj-1", filename="extra.pdf",
        status="ready", raw_text="Capacidad de obrar.",
        char_count=19, created_at="2024-01-01",
    ))
    db.commit()
    db.close()


class _UseOverrides:
    def __enter__(self):
        seed_basic()
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        return self

    def __exit__(self, *args):
        app.dependency_overrides.clear()


def use_summaries_overrides():
    return _UseOverrides()


@pytest.fixture
def client():
    return TestClient(app)


class TestSummaries:
    def test_generate_summary_201(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                res = client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-1"]},
                )
            assert res.status_code == 201
            data = res.json()
            assert data["subject_id"] == "subj-1"
            assert data["title"] == SAMPLE_SUMMARY_PAYLOAD["title"]
            assert "personalidad jurídica" in data["content"]
            assert data["document_ids"] == ["doc-1"]
            assert "id" in data
            assert "created_at" in data
            assert "updated_at" in data

    def test_generate_summary_empty_docs_422(self, client):
        with use_summaries_overrides():
            res = client.post(
                "/api/subjects/subj-1/summaries/generate",
                json={"document_ids": []},
            )
            assert res.status_code == 422

    def test_generate_summary_missing_doc_404(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                res = client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-nonexistent"]},
                )
            assert res.status_code == 404

    def test_generate_summary_other_user_subject_404(self, client):
        with use_summaries_overrides():
            db = TestingSessionLocal()
            db.add(User(id="user-2", google_sub="sub-2", email="o@test.com", name="O", created_at="2024-01-01"))
            db.add(Subject(id="subj-2", user_id="user-2", name="Otra", created_at="2024-01-01"))
            db.commit()
            db.close()
            res = client.post(
                "/api/subjects/subj-2/summaries/generate",
                json={"document_ids": ["doc-1"]},
            )
            assert res.status_code == 404

    def test_get_summary_200(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                created = client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-1"]},
                ).json()
            res = client.get(f"/api/summaries/{created['id']}")
            assert res.status_code == 200
            assert res.json()["title"] == created["title"]

    def test_get_summary_other_user_404(self, client):
        with use_summaries_overrides():
            db = TestingSessionLocal()
            db.add(User(id="user-2", google_sub="sub-2", email="o@test.com", name="O", created_at="2024-01-01"))
            db.add(Subject(id="subj-2", user_id="user-2", name="Otra", created_at="2024-01-01"))
            db.add(Summary(
                id="sum-other", subject_id="subj-2", title="X", content="Y",
                document_ids_json="[]", created_at="2024-01-01", updated_at="2024-01-01",
            ))
            db.commit()
            db.close()
            res = client.get("/api/summaries/sum-other")
            assert res.status_code == 404

    def test_list_summaries(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-1"]},
                )
                client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-2"]},
                )
            res = client.get("/api/subjects/subj-1/summaries")
            assert res.status_code == 200
            assert len(res.json()) == 2

    def test_rename_summary_200(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                created = client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-1"]},
                ).json()
            res = client.patch(
                f"/api/summaries/{created['id']}",
                json={"title": "Nuevo Título Manual"},
            )
            assert res.status_code == 200
            assert res.json()["title"] == "Nuevo Título Manual"

    def test_rename_summary_empty_422(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                created = client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-1"]},
                ).json()
            res = client.patch(f"/api/summaries/{created['id']}", json={"title": "   "})
            assert res.status_code == 422

    def test_regenerate_uses_stored_docs(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                created = client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-1"]},
                ).json()
                new_payload = {**SAMPLE_SUMMARY_PAYLOAD, "title": "Regenerado"}
                with patch("src.backend.modules.summaries.router._call_qwen",
                           return_value=new_payload):
                    res = client.post(f"/api/summaries/{created['id']}/regenerate", json={})
            assert res.status_code == 200
            data = res.json()
            assert data["title"] == "Regenerado"
            assert data["document_ids"] == ["doc-1"]
            assert data["id"] == created["id"]

    def test_regenerate_with_new_docs(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                created = client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-1"]},
                ).json()
                with patch("src.backend.modules.summaries.router._call_qwen",
                           return_value=SAMPLE_SUMMARY_PAYLOAD):
                    res = client.post(
                        f"/api/summaries/{created['id']}/regenerate",
                        json={"document_ids": ["doc-2"]},
                    )
            assert res.status_code == 200
            assert res.json()["document_ids"] == ["doc-2"]

    def test_regenerate_no_docs_available_422(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                created = client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-1"]},
                ).json()
            db = TestingSessionLocal()
            db.query(Document).filter(Document.id == "doc-1").delete()
            db.commit()
            db.close()
            res = client.post(f"/api/summaries/{created['id']}/regenerate", json={})
            assert res.status_code == 422

    def test_delete_summary_204(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                created = client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-1"]},
                ).json()
            res = client.delete(f"/api/summaries/{created['id']}")
            assert res.status_code == 204
            assert client.get(f"/api/summaries/{created['id']}").status_code == 404

    def test_delete_subject_cascades_summaries(self, client):
        with use_summaries_overrides():
            with patch("src.backend.modules.summaries.router._call_qwen",
                       return_value=SAMPLE_SUMMARY_PAYLOAD):
                client.post(
                    "/api/subjects/subj-1/summaries/generate",
                    json={"document_ids": ["doc-1"]},
                )
            db = TestingSessionLocal()
            assert db.query(Summary).count() == 1
            db.close()
            client.delete("/api/subjects/subj-1")
            db = TestingSessionLocal()
            assert db.query(Summary).count() == 0
            db.close()