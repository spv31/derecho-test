import pytest
from fastapi.testclient import TestClient


ROUTES = [
    ("GET", "/api/health", 200),
    ("GET", "/api/config", 200),
    ("POST", "/api/auth/google", 401),
    ("GET", "/api/subjects", 401),
    ("POST", "/api/subjects", 401),
    ("DELETE", "/api/subjects/test-id", 401),
    ("GET", "/api/subjects/test-id/documents", 401),
    ("POST", "/api/subjects/test-id/documents", 401),
    ("DELETE", "/api/documents/test-id", 401),
    ("GET", "/api/subjects/test-id/exams", 401),
    ("POST", "/api/subjects/test-id/exams/generate", 401),
    ("GET", "/api/exams/test-id", 401),
    ("DELETE", "/api/exams/test-id", 401),
]


class TestContract:

    def setup_method(self):
        from src.backend.core.config import settings
        settings.google_client_id = "test-client-id"

    @pytest.mark.parametrize("method,path,expected_status", ROUTES)
    def test_route_exists(self, client, method, path, expected_status):
        auth_header = {"Authorization": "Bearer test"}
        if method == "GET":
            if path in ("/api/health", "/api/config"):
                resp = client.get(path)
            else:
                resp = client.get(path, headers=auth_header)
        elif method == "POST":
            if path == "/api/auth/google":
                resp = client.post(path, json={"id_token": "test"})
            elif path == "/api/subjects":
                resp = client.post(path, json={"name": "test"}, headers=auth_header)
            elif path.endswith("/documents"):
                resp = client.post(path, files={"file": ("test.pdf", b"dummy", "application/pdf")},
                                   headers=auth_header)
            elif path.endswith("/exams/generate"):
                resp = client.post(path, json={"document_ids": ["d1"], "question_count": 5},
                                   headers=auth_header)
            else:
                resp = client.post(path)
        elif method == "DELETE":
            resp = client.delete(path, headers=auth_header)
        else:
            pytest.fail(f"Unknown method {method}")

        assert resp.status_code == expected_status, \
            f"{method} {path} expected {expected_status}, got {resp.status_code}: {resp.text}"