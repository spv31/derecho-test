# Contrato de la API interna — NaN Quiz Generator

Base: todas las rutas bajo /api. Respuestas JSON salvo indicación.

Autenticación: header `Authorization: Bearer <token>` (JWT de sesión propio) en TODOS

los endpoints salvo /api/health, /api/config y /api/auth/google.

Todo endpoint de subjects/documents/exams opera SOLO sobre datos del usuario del token.

Acceder a un recurso de otro usuario => 404 (no 403, para no filtrar existencia).

## Salud

- GET /api/health
  - Response 200: { "status": "ok" }

## Configuración pública

- GET /api/config
  - Response 200: { "google_client_id": string }

  - Sin autenticación. El frontend lo llama al cargar para inicializar el botón

    de Google sin tener el Client ID hardcodeado en el repositorio.

## Autenticación (Google OAuth)

- POST /api/auth/google
  - Request: { "id_token": string }

    (la credencial que devuelve el botón "Sign in with Google"; es un ID token JWT)

  - Response 200: { "token": string }

    (JWT de SESIÓN propio de la app — NO es el token de Google)

  - Response 401: el ID token de Google es inválido o ha expirado

  - Response 403: el correo autenticado no está en la allowlist (ALLOWED_EMAILS)

## Asignaturas

- GET /api/subjects
  - Response 200: Array<{ id, name, created_at }> (solo del usuario)

- POST /api/subjects
  - Request: { "name": string }

  - Response 201: { id, name, created_at }

- DELETE /api/subjects/:subject_id
  - Response 204 (borra en cascada sus documentos y exámenes)

  - Response 404 si no existe o no es del usuario

## Documentos

- GET /api/subjects/:subject_id/documents
  - Response 200: Array<{ id, filename, status, char_count, created_at }>

- POST /api/subjects/:subject_id/documents
  - Request: multipart/form-data, campo `file` (.pdf o .pptx)

  - Response 201: { id, filename, status, char_count } (extracción SÍNCRONA)

  - Response 400: tipo de fichero no soportado o fichero corrupto

  - Response 413: fichero demasiado grande (límite 25 MB)

- DELETE /api/documents/:document_id
  - Response 204 / 404

## Exámenes

- POST /api/subjects/:subject_id/exams/generate
  - Request: { "document_ids": [string], "question_count": integer (1..30) }

  - Response 201: objeto examen completo = { id, subject_id, title,

                  question_count, created_at, questions: [...] }

                  (questions según specs/qwen_schema.json)

  - Response 502: error del proveedor LLM (timeout, 429, 500, salida inválida)

- GET /api/subjects/:subject_id/exams
  - Response 200: Array<{ id, title, question_count, created_at }>

- GET /api/exams/:exam_id
  - Response 200: objeto examen completo (para renderizar y corregir en el frontend)

- DELETE /api/exams/:exam_id
  - Response 204 / 404
