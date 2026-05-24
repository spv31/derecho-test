from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from src.backend.modules.auth.dependencies import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


class ExamListItem(BaseModel):
    id: str
    title: str
    question_count: int
    created_at: str


class GenerateRequest(BaseModel):
    document_ids: List[str]
    question_count: int


@router.get("/api/subjects/{subject_id}/exams", response_model=List[ExamListItem])
def list_exams(subject_id: str):
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.post("/api/subjects/{subject_id}/exams/generate", status_code=201)
def generate_exam(subject_id: str, body: GenerateRequest):
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.get("/api/exams/{exam_id}")
def get_exam(exam_id: str):
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.delete("/api/exams/{exam_id}", status_code=204)
def delete_exam(exam_id: str):
    raise HTTPException(status_code=501, detail="Not Implemented")