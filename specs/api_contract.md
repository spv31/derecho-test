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

- PATCH /api/subjects/:subject_id
  - Request: { "name": string }

  - Response 200: { id, name, created_at }

  - Response 404 si no existe o no es del usuario

  - Response 422 si name está vacío o ausente

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
  - Response 200: Array<{ id, title, question_count, created_at, last_result }>

    last_result es null si no hay intentos, o { score, total, percentage } del último

- GET /api/exams/:exam_id
  - Response 200: objeto examen completo (para renderizar y corregir en el frontend)

- PATCH /api/exams/:exam_id
  - Request: { "title": string }

  - Response 200: { id, title, question_count, created_at }

  - Response 404 si no existe o no es del usuario

  - Response 422 si title está vacío o ausente

- DELETE /api/exams/:exam_id
  - Response 204 / 404

## Resultados de exámenes

- POST /api/exams/:exam_id/results
  - Request: { "answers": [integer|null, ...] }

    (array de índices seleccionados, misma longitud que questions del examen.
     null si la pregunta no fue respondida)

  - Response 201: { id, exam_id, score, total, percentage, answers, created_at }

  - Response 404: examen no existe o no es del usuario

  - Response 422: longitud de answers no coincide con question_count

- GET /api/exams/:exam_id/results
  - Response 200: Array<{ id, score, total, percentage, answers, created_at }>

    (intentos del usuario para este examen, ordenados por fecha descendente)

## Resúmenes

- GET /api/subjects/:subject_id/summaries
  - Response 200: Array<{ id, title, document_ids, created_at, updated_at }>

    (solo del usuario, ordenados por updated_at descendente)

- POST /api/subjects/:subject_id/summaries/generate
  - Request: { "document_ids": [string] }

  - Response 201: { id, subject_id, title, content, document_ids, created_at, updated_at }

    content es Markdown. document_ids es el array de IDs usados para generarlo.

  - Response 404 si el subject no es del usuario o alguno de los documentos no existe en él

  - Response 422 si document_ids está vacío o ausente

  - Response 502: error del proveedor LLM (timeout, 429, 500, salida inválida)

- GET /api/summaries/:summary_id
  - Response 200: { id, subject_id, title, content, document_ids, created_at, updated_at }

  - Response 404 si no existe o no es del usuario

- PATCH /api/summaries/:summary_id
  - Request: { "title": string }

  - Response 200: { id, subject_id, title, document_ids, created_at, updated_at }

  - Response 404 si no existe o no es del usuario

  - Response 422 si title está vacío o ausente

- POST /api/summaries/:summary_id/regenerate
  - Request: { "document_ids": [string] } (opcional; si se omite o es vacío, se usan los documentos originales)

  - Response 200: { id, subject_id, title, content, document_ids, created_at, updated_at }

    Reemplaza title y content del summary existente y actualiza updated_at.
    Si todos los documentos referenciados ya no existen, devuelve 422.

  - Response 404 si el summary no existe o no es del usuario

  - Response 422 si ningún documento válido está disponible

  - Response 502: error del proveedor LLM

- DELETE /api/summaries/:summary_id
  - Response 204 / 404
