FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser --disabled-password --no-create-home appuser
USER appuser

ENV DATA_DIR=/data

EXPOSE 8080

CMD ["uvicorn", "src.backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
