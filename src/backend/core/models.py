import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from src.backend.core.db import Base


def generate_uuid():
    return str(uuid.uuid4())


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    google_sub = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(String, nullable=False, default=_utcnow)

    subjects = relationship("Subject", back_populates="user", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(String, nullable=False, default=_utcnow)

    user = relationship("User", back_populates="subjects")
    documents = relationship("Document", back_populates="subject", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="subject", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False)
    filename = Column(String, nullable=False)
    status = Column(String, nullable=False, default="ready")
    raw_text = Column(Text, nullable=True)
    char_count = Column(Integer, nullable=True)
    created_at = Column(String, nullable=False, default=_utcnow)

    subject = relationship("Subject", back_populates="documents")


class Exam(Base):
    __tablename__ = "exams"

    id = Column(String, primary_key=True, default=generate_uuid)
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False)
    title = Column(String, nullable=False)
    question_count = Column(Integer, nullable=False)
    payload_json = Column(Text, nullable=False)
    created_at = Column(String, nullable=False, default=_utcnow)

    subject = relationship("Subject", back_populates="exams")