import time
from collections import defaultdict

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from src.backend.core.db import create_all

from src.backend.modules.auth.router import router as auth_router
from src.backend.modules.subjects.router import router as subjects_router
from src.backend.modules.documents.router import router as documents_router
from src.backend.modules.exams.router import router as exams_router
from src.backend.modules.summaries.router import router as summaries_router

app = FastAPI(title="NaN Quiz Generator")

# --- Rate limiter ---
RATE_LIMIT_RULES: dict[str, tuple[int, int, str]] = {
    "auth_google": (5, 60, "post_/api/auth/google"),
    "exams_generate": (3, 60, "/exams/generate"),
    "summaries_generate": (3, 60, "/summaries/generate"),
    "summaries_regenerate": (3, 60, "/regenerate"),
}

# Module-level rate limit history for testability
_rate_limit_history: dict[str, list[float]] = defaultdict(list)


def clear_rate_limit_history():
    _rate_limit_history.clear()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/")
        method = request.method.lower()

        matched_limits = None
        for _key, (max_reqs, window, pattern) in RATE_LIMIT_RULES.items():
            if pattern.startswith("post_"):
                if f"{method}_{path}" == pattern:
                    matched_limits = (max_reqs, window)
                    break
            elif method == "post" and path.endswith(pattern):
                matched_limits = (max_reqs, window)
                break

        if matched_limits:
            max_reqs, window = matched_limits
            ip = request.client.host if request.client else "unknown"
            now = time.time()
            _rate_limit_history[ip] = [t for t in _rate_limit_history[ip] if now - t < window]
            if len(_rate_limit_history[ip]) >= max_reqs:
                return JSONResponse(status_code=429, content={"detail": "Too Many Requests"})
            _rate_limit_history[ip].append(now)
        return await call_next(request)


app.add_middleware(RateLimitMiddleware)


# --- Security headers ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)


app.include_router(auth_router)
app.include_router(subjects_router)
app.include_router(documents_router)
app.include_router(exams_router)
app.include_router(summaries_router)

app.mount("/", StaticFiles(directory="src/frontend", html=True), name="frontend")


@app.on_event("startup")
def on_startup():
    create_all()