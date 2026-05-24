import json
import logging
from pathlib import Path
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend.core.config import settings
from src.backend.core.db import get_db
from src.backend.core.models import Document, Exam, Subject, User
from src.backend.modules.auth.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_current_user)])


class ExamListItem(BaseModel):
    id: str
    title: str
    question_count: int
    created_at: str


class ExamDetail(BaseModel):
    id: str
    subject_id: str
    title: str
    question_count: int
    created_at: str
    questions: list


class GenerateRequest(BaseModel):
    document_ids: List[str]
    question_count: int


QWEN_SCHEMA_PATH = Path(__file__).resolve().parents[4] / "specs" / "qwen_schema.json"
SYSTEM_PROMPT = (
    "Eres un generador de exámenes tipo test para estudiantes universitarios. "
    "Generas preguntas de opción múltiple basadas EXCLUSIVAMENTE en el material de estudio "
    "que se te proporciona. Reglas:\n"
    "- No uses conocimiento externo al material. Si algo no está en el material, no preguntes sobre ello.\n"
    "- Escribe las preguntas y opciones en el MISMO idioma que el material.\n"
    "- Los distractores (opciones incorrectas) deben ser plausibles, no absurdos.\n"
    "- No repitas preguntas ni opciones equivalentes.\n"
    "- Varía la dificultad y cubre temas distintos del material.\n"
    "- La 'explanation' debe citar o referenciar la parte concreta del material que justifica la respuesta.\n"
    "- Devuelve EXACTAMENTE la estructura JSON exigida por el schema, sin texto extra."
)
MAX_MATERIAL_CHARS = 400_000


def _get_user_subject(subject_id: str, user: User, db: Session) -> Subject:
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == user.id,
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Not Found")
    return subject


def _load_qwen_schema() -> dict:
    with open(QWEN_SCHEMA_PATH, "r") as f:
        return json.load(f)


def _build_material(document_ids: List[str], subject: Subject, db: Session) -> str:
    docs = (
        db.query(Document)
        .filter(
            Document.id.in_(document_ids),
            Document.subject_id == subject.id,
        )
        .all()
    )
    found_ids = {d.id for d in docs}
    for did in document_ids:
        if did not in found_ids:
            raise HTTPException(
                status_code=404,
                detail=f"Document {did} not found in this subject",
            )
    parts = []
    for d in docs:
        text = d.raw_text or ""
        parts.append(f"--- {d.filename} ---\n{text}")
    material = "\n\n".join(parts)
    if len(material) > MAX_MATERIAL_CHARS:
        logger.warning(
            "Material too long (%d chars), truncating to %d chars",
            len(material), MAX_MATERIAL_CHARS,
        )
        material = material[:MAX_MATERIAL_CHARS]
    return material


def _build_payload(question_count: int, material: str) -> dict:
    user_prompt = (
        f"Genera un examen de EXACTAMENTE {question_count} preguntas a partir del "
        f"siguiente material de estudio:\n\n{material}"
    )
    qwen_schema = _load_qwen_schema()
    return {
        "model": "qwen3.6",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": qwen_schema,
        },
    }


def _call_qwen(payload: dict) -> dict:
    try:
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(
                f"{settings.nan_api_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.nan_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=502, detail="LLM provider timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"LLM provider error: {e}")

    if resp.status_code in (429,) or resp.status_code >= 500:
        raise HTTPException(status_code=502, detail=f"LLM provider returned {resp.status_code}")

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"LLM provider unexpected status {resp.status_code}")

    data = resp.json()
    choice = data["choices"][0]
    content = choice["message"]["content"]
    try:
        result = json.loads(content)
    except (json.JSONDecodeError, KeyError) as e:
        raise HTTPException(status_code=502, detail=f"Invalid JSON from LLM: {e}")
    return result


def _validate_exam(result: dict, question_count: int) -> dict:
    questions = result.get("questions", [])
    if not questions:
        raise ValueError("No questions in response")
    if abs(len(questions) - question_count) > max(2, question_count // 2):
        raise ValueError(
            f"Question count mismatch: expected ~{question_count}, got {len(questions)}"
        )
    for q in questions:
        options = q.get("options", [])
        ci = q.get("correct_index")
        if not isinstance(ci, int) or ci < 0 or ci >= len(options):
            raise ValueError(
                f"correct_index {ci} out of range for {len(options)} options"
            )
    return result


@router.get("/api/subjects/{subject_id}/exams", response_model=List[ExamListItem])
def list_exams(
    subject_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    subject = _get_user_subject(subject_id, user, db)
    exams = db.query(Exam).filter(Exam.subject_id == subject.id).all()
    return [
        ExamListItem(id=e.id, title=e.title, question_count=e.question_count, created_at=e.created_at)
        for e in exams
    ]


@router.post("/api/subjects/{subject_id}/exams/generate", status_code=201)
def generate_exam(
    subject_id: str,
    body: GenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.question_count < 1 or body.question_count > 30:
        raise HTTPException(status_code=422, detail="question_count must be between 1 and 30")
    if not body.document_ids:
        raise HTTPException(status_code=422, detail="document_ids must not be empty")

    subject = _get_user_subject(subject_id, user, db)
    material = _build_material(body.document_ids, subject, db)
    payload = _build_payload(body.question_count, material)

    for attempt in range(2):
        try:
            result = _call_qwen(payload)
            result = _validate_exam(result, body.question_count)
            break
        except (HTTPException, ValueError) as e:
            if attempt == 1:
                if isinstance(e, HTTPException):
                    raise e
                raise HTTPException(status_code=502, detail=f"Validation failed after retry: {e}")
            logger.warning("Attempt %d failed, retrying: %s", attempt + 1, e)
    else:
        raise HTTPException(status_code=502, detail="Failed to generate valid exam")

    exam = Exam(
        subject_id=subject.id,
        title=result.get("title", "Untitled"),
        question_count=len(result.get("questions", [])),
        payload_json=json.dumps(result),
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)

    return ExamDetail(
        id=exam.id,
        subject_id=exam.subject_id,
        title=exam.title,
        question_count=exam.question_count,
        created_at=exam.created_at,
        questions=result.get("questions", []),
    )


@router.get("/api/exams/{exam_id}")
def get_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    exam = (
        db.query(Exam)
        .join(Subject, Exam.subject_id == Subject.id)
        .filter(Exam.id == exam_id, Subject.user_id == user.id)
        .first()
    )
    if not exam:
        raise HTTPException(status_code=404, detail="Not Found")
    payload = json.loads(exam.payload_json)
    return ExamDetail(
        id=exam.id,
        subject_id=exam.subject_id,
        title=exam.title,
        question_count=exam.question_count,
        created_at=exam.created_at,
        questions=payload.get("questions", []),
    )


@router.delete("/api/exams/{exam_id}", status_code=204)
def delete_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    exam = (
        db.query(Exam)
        .join(Subject, Exam.subject_id == Subject.id)
        .filter(Exam.id == exam_id, Subject.user_id == user.id)
        .first()
    )
    if not exam:
        raise HTTPException(status_code=404, detail="Not Found")
    db.delete(exam)
    db.commit()