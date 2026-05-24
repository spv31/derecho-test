from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from src.backend.modules.auth.dependencies import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


class SubjectOut(BaseModel):
    id: str
    name: str
    created_at: str


class SubjectCreate(BaseModel):
    name: str


@router.get("/api/subjects", response_model=List[SubjectOut])
def list_subjects():
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.post("/api/subjects", status_code=201, response_model=SubjectOut)
def create_subject(body: SubjectCreate):
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.delete("/api/subjects/{subject_id}", status_code=204)
def delete_subject(subject_id: str):
    raise HTTPException(status_code=501, detail="Not Implemented")