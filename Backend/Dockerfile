FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libraqm0 && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY --chown=10001:10001 src ./src
COPY --chown=10001:10001 alembic.ini ./
COPY --chown=10001:10001 migrations ./migrations
ENV PYTHONPATH=/app/src
USER 10001
CMD ["uvicorn", "nilart.bootstrap.main:app", "--host", "0.0.0.0", "--port", "8000"]
