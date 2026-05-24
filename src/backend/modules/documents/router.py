from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List
from src.backend.modules.auth.dependencies import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


class DocumentOut(BaseModel):
    id: str
    filename: str
    status: str
    char_count: int | None = None
    created_at: str | None = None


class DocumentCreateOut(BaseModel):
    id: str
    filename: str
    status: str
    char_count: int | None = None


@router.get("/api/subjects/{subject_id}/documents", response_model=List[DocumentOut])
def list_documents(subject_id: str):
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.post("/api/subjects/{subject_id}/documents", status_code=201, response_model=DocumentCreateOut)
def create_document(subject_id: str, file: UploadFile = File(...)):
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.delete("/api/documents/{document_id}", status_code=204)
def delete_document(document_id: str):
    raise HTTPException(status_code=501, detail="Not Implemented")