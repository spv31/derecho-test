FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p data && adduser --disabled-password --no-create-home appuser && chown appuser:appuser data
USER appuser

EXPOSE 8080

CMD ["uvicorn", "src.backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
