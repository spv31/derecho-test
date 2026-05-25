from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List
from sqlalchemy.orm import Session
from src.backend.core.db import get_db
from src.backend.core.models import Subject, User
from src.backend.modules.auth.dependencies import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


class SubjectOut(BaseModel):
    id: str
    name: str
    created_at: str


class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class SubjectRename(BaseModel):
    name: str


@router.get("/api/subjects", response_model=List[SubjectOut])
def list_subjects(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    subjects = db.query(Subject).filter(Subject.user_id == user.id).all()
    return [
        SubjectOut(id=s.id, name=s.name, created_at=s.created_at)
        for s in subjects
    ]


@router.post("/api/subjects", status_code=201, response_model=SubjectOut)
def create_subject(
    body: SubjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    subject = Subject(name=body.name, user_id=user.id)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return SubjectOut(id=subject.id, name=subject.name, created_at=subject.created_at)


@router.patch("/api/subjects/{subject_id}", response_model=SubjectOut)
def rename_subject(
    subject_id: str,
    body: SubjectRename,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not body.name or not body.name.strip():
        raise HTTPException(status_code=422, detail="Name must not be empty")
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == user.id,
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Not Found")
    subject.name = body.name.strip()
    db.commit()
    db.refresh(subject)
    return SubjectOut(id=subject.id, name=subject.name, created_at=subject.created_at)


@router.delete("/api/subjects/{subject_id}", status_code=204)
def delete_subject(
    subject_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == user.id,
    ).first()
    if subject is None:
        raise HTTPException(status_code=404, detail="Not Found")
    db.delete(subject)
    db.commit()