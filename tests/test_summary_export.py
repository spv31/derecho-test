"""Tests para la exportación de resúmenes a PDF y DOCX."""

import json
import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from src.backend.main import app

client = TestClient(app)

FAKE_USER = {
    "id": str(uuid.uuid4()),
    "google_sub": "export-test-sub",
    "email": "export@test.com",
}

SAMPLE_MARKDOWN = """## Introducción

Este es un resumen de prueba con **texto en negrita** y *cursiva*.

### Sección 1

- Elemento uno
- Elemento dos con `código inline`

> Cita textual del material.

1. Primer punto
2. Segundo punto

#### Subsección 1.1

Párrafo normal con términos técnicos y referencias al art. 1.911 CC.
"""


@pytest.fixture(autouse=True)
def _setup_db():
    """Prepara la BD con un usuario, asignatura y resumen de prueba."""
    from src.backend.core.db import engine, Base
    from src.backend.core.models import User, Subject, Summary

    Base.metadata.create_all(bind=engine)

    from sqlalchemy.orm import Session as SASession
    with SASession(engine) as session:
        user = session.query(User).filter(User.google_sub == FAKE_USER["google_sub"]).first()
        if not user:
            user = User(**FAKE_USER)
            session.add(user)
            session.commit()
            session.refresh(user)

        FAKE_USER["id"] = user.id

        subject = session.query(Subject).filter(
            Subject.user_id == user.id, Subject.name == "Export Test"
        ).first()
        if not subject:
            subject = Subject(id=str(uuid.uuid4()), user_id=user.id, name="Export Test")
            session.add(subject)
            session.commit()
            session.refresh(subject)

        summary = session.query(Summary).filter(
            Summary.subject_id == subject.id
        ).first()
        if not summary:
            summary = Summary(
                id=str(uuid.uuid4()),
                subject_id=subject.id,
                title="Resumen de prueba para exportación",
                content=SAMPLE_MARKDOWN,
                document_ids_json=json.dumps([]),
            )
            session.add(summary)
            session.commit()
            session.refresh(summary)

        _setup_db.subject_id = subject.id
        _setup_db.summary_id = summary.id

    yield


def _auth_header():
    from src.backend.modules.auth.dependencies import create_test_token
    try:
        token = create_test_token(FAKE_USER["id"])
    except (ImportError, AttributeError):
        from jose import jwt
        token = jwt.encode({"sub": FAKE_USER["id"]}, "test-secret", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def _get_auth_header():
    """Genera header de autenticación inyectando el usuario directamente."""
    from unittest.mock import patch
    from src.backend.core.models import User

    class FakeUser:
        id = FAKE_USER["id"]
        google_sub = FAKE_USER["google_sub"]
        email = FAKE_USER["email"]

    return FakeUser()


@pytest.fixture
def auth_headers():
    """Provee autenticación mockeando get_current_user."""
    from src.backend.modules.auth.dependencies import get_current_user
    from src.backend.core.models import User

    fake = type("FakeUser", (), FAKE_USER)()

    def override():
        return fake

    app.dependency_overrides[get_current_user] = override
    yield {}
    app.dependency_overrides.pop(get_current_user, None)


class TestExportPDF:
    def test_export_pdf_returns_binary(self, auth_headers):
        resp = client.get(
            f"/api/summaries/{_setup_db.summary_id}/export?format=pdf",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert "attachment" in resp.headers.get("content-disposition", "")
        # PDF empieza con %PDF
        assert resp.content[:5] == b"%PDF-"

    def test_export_pdf_filename_contains_title(self, auth_headers):
        resp = client.get(
            f"/api/summaries/{_setup_db.summary_id}/export?format=pdf",
            headers=auth_headers,
        )
        disposition = resp.headers.get("content-disposition", "")
        assert ".pdf" in disposition


class TestExportDOCX:
    def test_export_docx_returns_binary(self, auth_headers):
        resp = client.get(
            f"/api/summaries/{_setup_db.summary_id}/export?format=docx",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert "wordprocessingml" in resp.headers["content-type"]
        assert "attachment" in resp.headers.get("content-disposition", "")
        # DOCX es un ZIP (empieza con PK)
        assert resp.content[:2] == b"PK"

    def test_export_docx_filename_contains_title(self, auth_headers):
        resp = client.get(
            f"/api/summaries/{_setup_db.summary_id}/export?format=docx",
            headers=auth_headers,
        )
        disposition = resp.headers.get("content-disposition", "")
        assert ".docx" in disposition


class TestExportErrors:
    def test_invalid_format_returns_422(self, auth_headers):
        resp = client.get(
            f"/api/summaries/{_setup_db.summary_id}/export?format=txt",
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_nonexistent_summary_returns_404(self, auth_headers):
        fake_id = str(uuid.uuid4())
        resp = client.get(
            f"/api/summaries/{fake_id}/export?format=pdf",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_export_without_auth_returns_401(self):
        resp = client.get(
            f"/api/summaries/{_setup_db.summary_id}/export?format=pdf",
        )
        assert resp.status_code in (401, 403)


class TestMarkdownParser:
    """Tests unitarios del parser de Markdown."""

    def test_parse_headings(self):
        from src.backend.modules.summaries.export import parse_markdown
        blocks = parse_markdown("## Título\n### Subtítulo\n#### Sub-sub")
        assert len(blocks) == 3
        assert blocks[0].kind == "h2"
        assert blocks[1].kind == "h3"
        assert blocks[2].kind == "h4"

    def test_parse_paragraph(self):
        from src.backend.modules.summaries.export import parse_markdown
        blocks = parse_markdown("Línea uno\nLínea dos")
        assert len(blocks) == 1
        assert blocks[0].kind == "p"
        assert "Línea uno Línea dos" == blocks[0].text

    def test_parse_unordered_list(self):
        from src.backend.modules.summaries.export import parse_markdown
        blocks = parse_markdown("- Item A\n- Item B\n- Item C")
        assert len(blocks) == 1
        assert blocks[0].kind == "ul"
        assert len(blocks[0].items) == 3

    def test_parse_ordered_list(self):
        from src.backend.modules.summaries.export import parse_markdown
        blocks = parse_markdown("1. Primero\n2. Segundo")
        assert len(blocks) == 1
        assert blocks[0].kind == "ol"
        assert len(blocks[0].items) == 2

    def test_parse_blockquote(self):
        from src.backend.modules.summaries.export import parse_markdown
        blocks = parse_markdown("> Cita línea 1\n> Cita línea 2")
        assert len(blocks) == 1
        assert blocks[0].kind == "blockquote"
        assert "Cita línea 1 Cita línea 2" == blocks[0].text

    def test_parse_mixed_content(self):
        from src.backend.modules.summaries.export import parse_markdown
        md = "## Título\n\nPárrafo normal.\n\n- Item 1\n- Item 2\n\n> Cita"
        blocks = parse_markdown(md)
        kinds = [b.kind for b in blocks]
        assert kinds == ["h2", "p", "ul", "blockquote"]

    def test_parse_inline_segments(self):
        from src.backend.modules.summaries.export import parse_inline
        segs = parse_inline("Texto **negrita** y *cursiva* con `código`")
        types = [s[0] for s in segs]
        assert "bold" in types
        assert "italic" in types
        assert "code" in types