FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY --chown=10001:10001 src ./src
COPY --chown=10001:10001 alembic.ini ./
COPY --chown=10001:10001 migrations ./migrations
ENV PYTHONPATH=/app/src
USER 10001
CMD ["uvicorn", "nilart.bootstrap.main:app", "--host", "0.0.0.0", "--port", "8000"]
