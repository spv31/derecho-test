from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from src.backend.core.db import create_all

from src.backend.modules.auth.router import router as auth_router
from src.backend.modules.subjects.router import router as subjects_router
from src.backend.modules.documents.router import router as documents_router
from src.backend.modules.exams.router import router as exams_router

app = FastAPI(title="NaN Quiz Generator")

app.include_router(auth_router)
app.include_router(subjects_router)
app.include_router(documents_router)
app.include_router(exams_router)

app.mount("/", StaticFiles(directory="src/frontend", html=True), name="frontend")


@app.on_event("startup")
def on_startup():
    create_all()