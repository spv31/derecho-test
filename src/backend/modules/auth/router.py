from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend.core.config import settings
from src.backend.core.db import get_db
from src.backend.core.models import User, generate_uuid

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


@router.post("/api/auth/google", response_model=GoogleAuthResponse)
def auth_google(body: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        info = google_id_token.verify_oauth2_token(
            body.id_token, google_requests.Request(), audience=settings.google_client_id
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired Google ID token")

    google_sub = info.get("sub")
    email = info.get("email")
    name = info.get("name")

    if not email or email not in settings.allowed_emails_list:
        raise HTTPException(status_code=403, detail="Email not in allowlist")

    user = db.query(User).filter(User.google_sub == google_sub).first()
    if not user:
        user = User(
            id=generate_uuid(),
            google_sub=google_sub,
            email=email,
            name=name,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": user.id, "exp": now + timedelta(hours=24)},
        settings.jwt_secret,
        algorithm="HS256",
    )
    return GoogleAuthResponse(token=token)