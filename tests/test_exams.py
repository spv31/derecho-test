import json
from contextlib import contextmanager
from unittest.mock import patch

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.backend.main import app
from src.backend.core.db import Base, get_db
from src.backend.core.models import Document, Exam, Subject, User
from src.backend.modules.auth.dependencies import get_current_user

SAMPLE_EXAM_PAYLOAD = {
    "title": "Sample Exam",
    "questions": [
        {
            "question": "What is 2+2?",
            "options": ["3", "4", "5"],
            "explanation": "2+2=4 is basic arithmetic.",
            "correct_index": 1,
        },
        {
            "question": "What is the capital of France?",
            "options": ["London", "Berlin", "Paris", "Madrid"],
            "explanation": "Paris is the capital of France.",
            "correct_index": 2,
        },
    ],
}

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
def use_exams_overrides():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    try:
        yield
    finally:
        del app.dependency_overrides[get_db]
        del app.dependency_overrides[get_current_user]


class TestExams:

    def setup_method(self):
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        db.add(User(id="user-1", google_sub="sub-1", email="test@test.com", name="Test", created_at="2024-01-01"))
        db.add(Subject(id="subj-1", user_id="user-1", name="Math", created_at="2024-01-01"))
        db.add(Document(id="doc-1", subject_id="subj-1", filename="notes.pdf",
                        raw_text="2+2=4. Paris is the capital of France.",
                        status="ready", char_count=50, created_at="2024-01-01"))
        db.add(Document(id="doc-2", subject_id="subj-1", filename="extra.pdf",
                        raw_text="More study material.",
                        status="ready", char_count=20, created_at="2024-01-01"))
        db.commit()
        db.close()

    def teardown_method(self):
        Base.metadata.drop_all(bind=engine)

    def test_generate_exam_201(self, client):
        with patch("src.backend.modules.exams.router._call_qwen", return_value=SAMPLE_EXAM_PAYLOAD):
            with use_exams_overrides():
                resp = client.post(
                    "/api/subjects/subj-1/exams/generate",
                    json={"document_ids": ["doc-1", "doc-2"], "question_count": 2},
                    headers={"Authorization": "Bearer test"},
                )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["title"] == "Sample Exam"
        assert data["question_count"] == 2
        assert data["subject_id"] == "subj-1"
        assert "id" in data
        assert "created_at" in data
        assert len(data["questions"]) == 2
        assert data["questions"][0]["correct_index"] == 1

    def test_generate_exam_persists(self, client):
        with patch("src.backend.modules.exams.router._call_qwen", return_value=SAMPLE_EXAM_PAYLOAD):
            with use_exams_overrides():
                resp = client.post(
                    "/api/subjects/subj-1/exams/generate",
                    json={"document_ids": ["doc-1"], "question_count": 2},
                    headers={"Authorization": "Bearer test"},
                )
        assert resp.status_code == 201
        db = TestingSessionLocal()
        count = db.query(Exam).count()
        db.close()
        assert count == 1

    def test_generate_exam_invalid_question_count(self, client):
        with use_exams_overrides():
            resp = client.post(
                "/api/subjects/subj-1/exams/generate",
                json={"document_ids": ["doc-1"], "question_count": 0},
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code == 422

    def test_generate_exam_empty_document_ids(self, client):
        with use_exams_overrides():
            resp = client.post(
                "/api/subjects/subj-1/exams/generate",
                json={"document_ids": [], "question_count": 5},
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code == 422

    def test_generate_exam_wrong_subject_404(self, client):
        with use_exams_overrides():
            resp = client.post(
                "/api/subjects/subj-nonexistent/exams/generate",
                json={"document_ids": ["doc-1"], "question_count": 2},
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code == 404

    def test_generate_exam_wrong_document_404(self, client):
        with use_exams_overrides():
            resp = client.post(
                "/api/subjects/subj-1/exams/generate",
                json={"document_ids": ["doc-nonexistent"], "question_count": 2},
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code == 404

    def test_generate_exam_llm_error_502(self, client):
        with patch("src.backend.modules.exams.router._call_qwen", side_effect=HTTPException(status_code=502, detail="LLM provider returned 500")):
            with use_exams_overrides():
                resp = client.post(
                    "/api/subjects/subj-1/exams/generate",
                    json={"document_ids": ["doc-1"], "question_count": 2},
                    headers={"Authorization": "Bearer test"},
                )
        assert resp.status_code == 502

    def test_generate_exam_llm_timeout_502(self, client):
        with patch("src.backend.modules.exams.router._call_qwen", side_effect=HTTPException(status_code=502, detail="LLM provider timeout")):
            with use_exams_overrides():
                resp = client.post(
                    "/api/subjects/subj-1/exams/generate",
                    json={"document_ids": ["doc-1"], "question_count": 2},
                    headers={"Authorization": "Bearer test"},
                )
        assert resp.status_code == 502

    def test_generate_exam_bad_json_from_llm_502(self, client):
        with patch("src.backend.modules.exams.router._call_qwen", side_effect=HTTPException(status_code=502, detail="Invalid JSON from LLM")):
            with use_exams_overrides():
                resp = client.post(
                    "/api/subjects/subj-1/exams/generate",
                    json={"document_ids": ["doc-1"], "question_count": 2},
                    headers={"Authorization": "Bearer test"},
                )
        assert resp.status_code == 502

    def test_generate_exam_invalid_correct_index_retry(self, client):
        bad_payload = {
            "title": "Bad",
            "questions": [
                {
                    "question": "Q?",
                    "options": ["A", "B"],
                    "explanation": "E.",
                    "correct_index": 5,
                }
            ],
        }

        with patch("src.backend.modules.exams.router._call_qwen", return_value=bad_payload):
            with use_exams_overrides():
                resp = client.post(
                    "/api/subjects/subj-1/exams/generate",
                    json={"document_ids": ["doc-1"], "question_count": 1},
                    headers={"Authorization": "Bearer test"},
                )
        assert resp.status_code == 502

    def test_list_exams(self, client):
        db = TestingSessionLocal()
        db.add(Exam(id="exam-1", subject_id="subj-1", title="Test Exam",
                    question_count=2, payload_json=json.dumps(SAMPLE_EXAM_PAYLOAD),
                    created_at="2024-01-01"))
        db.commit()
        db.close()
        with use_exams_overrides():
            resp = client.get("/api/subjects/subj-1/exams", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "Test Exam"
        assert data[0]["question_count"] == 2

    def test_list_exams_scoped_to_subject(self, client):
        db = TestingSessionLocal()
        db.add(Subject(id="subj-other", user_id="user-1", name="Physics", created_at="2024-01-01"))
        db.add(Exam(id="exam-1", subject_id="subj-1", title="Math Exam",
                    question_count=2, payload_json="{}", created_at="2024-01-01"))
        db.add(Exam(id="exam-2", subject_id="subj-other", title="Physics Exam",
                    question_count=3, payload_json="{}", created_at="2024-01-01"))
        db.commit()
        db.close()
        with use_exams_overrides():
            resp = client.get("/api/subjects/subj-1/exams", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "Math Exam"

    def test_list_exams_other_user_subject_404(self, client):
        db = TestingSessionLocal()
        db.add(User(id="user-2", google_sub="sub-2", email="other@test.com", name="Other", created_at="2024-01-01"))
        db.add(Subject(id="subj-other", user_id="user-2", name="Physics", created_at="2024-01-01"))
        db.commit()
        db.close()
        with use_exams_overrides():
            resp = client.get("/api/subjects/subj-other/exams", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 404

    def test_get_exam_detail(self, client):
        db = TestingSessionLocal()
        db.add(Exam(id="exam-1", subject_id="subj-1", title="Detail Exam",
                    question_count=2, payload_json=json.dumps(SAMPLE_EXAM_PAYLOAD),
                    created_at="2024-01-01"))
        db.commit()
        db.close()
        with use_exams_overrides():
            resp = client.get("/api/exams/exam-1", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Detail Exam"
        assert data["question_count"] == 2
        assert data["subject_id"] == "subj-1"
        assert len(data["questions"]) == 2
        assert data["id"] == "exam-1"

    def test_get_exam_other_user_404(self, client):
        db = TestingSessionLocal()
        db.add(User(id="user-2", google_sub="sub-2", email="other@test.com", name="Other", created_at="2024-01-01"))
        db.add(Subject(id="subj-other", user_id="user-2", name="Physics", created_at="2024-01-01"))
        db.add(Exam(id="exam-other", subject_id="subj-other", title="Other Exam",
                    question_count=2, payload_json="{}", created_at="2024-01-01"))
        db.commit()
        db.close()
        with use_exams_overrides():
            resp = client.get("/api/exams/exam-other", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 404

    def test_get_nonexistent_exam_404(self, client):
        with use_exams_overrides():
            resp = client.get("/api/exams/nonexistent", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 404

    def test_delete_own_exam(self, client):
        db = TestingSessionLocal()
        db.add(Exam(id="exam-1", subject_id="subj-1", title="Delete Exam",
                    question_count=2, payload_json="{}", created_at="2024-01-01"))
        db.commit()
        db.close()
        with use_exams_overrides():
            resp = client.delete("/api/exams/exam-1", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 204
        db = TestingSessionLocal()
        assert db.query(Exam).count() == 0
        db.close()

    def test_delete_other_user_exam_404(self, client):
        db = TestingSessionLocal()
        db.add(User(id="user-2", google_sub="sub-2", email="other@test.com", name="Other", created_at="2024-01-01"))
        db.add(Subject(id="subj-other", user_id="user-2", name="Physics", created_at="2024-01-01"))
        db.add(Exam(id="exam-other", subject_id="subj-other", title="Other Exam",
                    question_count=2, payload_json="{}", created_at="2024-01-01"))
        db.commit()
        db.close()
        with use_exams_overrides():
            resp = client.delete("/api/exams/exam-other", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 404

    def test_delete_nonexistent_exam_404(self, client):
        with use_exams_overrides():
            resp = client.delete("/api/exams/nonexistent", headers={"Authorization": "Bearer test"})
        assert resp.status_code == 404

    def test_rename_exam(self, client):
        with use_exams_overrides():
            with patch("src.backend.modules.exams.router._call_qwen", return_value=SAMPLE_EXAM_PAYLOAD):
                gen = client.post("/api/subjects/subj-1/exams/generate",
                                  json={"document_ids": ["doc-1"], "question_count": 2})
            exam_id = gen.json()["id"]
            res = client.patch(f"/api/exams/{exam_id}", json={"title": "Nuevo título"})
            assert res.status_code == 200
            data = res.json()
            assert data["title"] == "Nuevo título"
            assert data["id"] == exam_id
            detail = client.get(f"/api/exams/{exam_id}")
            assert detail.json()["title"] == "Nuevo título"

    def test_rename_exam_empty_title_422(self, client):
        with use_exams_overrides():
            with patch("src.backend.modules.exams.router._call_qwen", return_value=SAMPLE_EXAM_PAYLOAD):
                gen = client.post("/api/subjects/subj-1/exams/generate",
                                  json={"document_ids": ["doc-1"], "question_count": 2})
            exam_id = gen.json()["id"]
            res = client.patch(f"/api/exams/{exam_id}", json={"title": "   "})
            assert res.status_code == 422

    def test_rename_exam_other_user_404(self, client):
        with use_exams_overrides():
            db = TestingSessionLocal()
            db.add(User(id="user-2", google_sub="sub-2", email="other@test.com", name="Other", created_at="2024-01-01"))
            db.add(Subject(id="subj-2", user_id="user-2", name="Other Math", created_at="2024-01-01"))
            db.add(Exam(id="exam-other", subject_id="subj-2", title="Other Exam",
                        question_count=1, payload_json='{"questions":[]}', created_at="2024-01-01"))
            db.commit()
            db.close()
            res = client.patch("/api/exams/exam-other", json={"title": "Hacked"})
            assert res.status_code == 404

    def test_rename_nonexistent_exam_404(self, client):
        with use_exams_overrides():
            res = client.patch("/api/exams/nonexistent", json={"title": "X"})
            assert res.status_code == 404