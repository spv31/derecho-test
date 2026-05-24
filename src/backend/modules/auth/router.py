from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.backend.core.config import settings

router = APIRouter()


class GoogleAuthRequest(BaseModel):
    id_token: str


class GoogleAuthResponse(BaseModel):
    token: str


class ConfigResponse(BaseModel):
    google_client_id: str


@router.get("/api/health")
def health():
    return {"status": "ok"}


@router.get("/api/config", response_model=ConfigResponse)
def config():
    return ConfigResponse(google_client_id=settings.google_client_id)


@router.post("/api/auth/google")
def auth_google(body: GoogleAuthRequest):
    raise HTTPException(status_code=501, detail="Not Implemented")