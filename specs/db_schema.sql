-- Contrato documental del esquema. El ORM (SQLAlchemy) DEBE reflejarlo fielmente.
-- IDs como TEXT (uuid4 generado en aplicación). Timestamps en formato ISO-8601.
CREATE TABLE
  users (
    id TEXT PRIMARY KEY, -- uuid de aplicación
    google_sub TEXT NOT NULL UNIQUE, -- claim 'sub' del ID token de Google (identificador estable)
    email TEXT NOT NULL,
    name TEXT, -- nombre para mostrar (opcional)
    created_at TEXT NOT NULL DEFAULT (datetime ('now'))
  );

CREATE TABLE
  subjects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id),
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime ('now'))
  );

CREATE TABLE
  documents (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects (id),
    filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready', -- 'ready' | 'failed'
    raw_text TEXT, -- texto extraído; el binario NO se guarda
    char_count INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime ('now'))
  );

CREATE TABLE
  exams (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects (id),
    title TEXT NOT NULL,
    question_count INTEGER NOT NULL,
    payload_json TEXT NOT NULL, -- objeto examen completo serializado
    created_at TEXT NOT NULL DEFAULT (datetime ('now'))
  );