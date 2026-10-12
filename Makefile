SHELL := /bin/sh
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
ENV ?= development
ENV_FILE ?= $(ROOT)/.env
PYTHON ?= python3.12
VENV := $(ROOT)/Backend/.venv
COMPOSE := docker compose --env-file $(ENV_FILE) -f $(ROOT)/infra/docker/compose.yaml
ifeq ($(ENV),production)
COMPOSE += -f $(ROOT)/infra/docker/compose.production.yaml
else ifneq ($(ENV),development)
$(error ENV must be development or production)
endif
.DEFAULT_GOAL := help
.PHONY: help install up down logs migrate test lint typecheck build api-client check design-reference
help:
	@echo 'Targets: install up down logs migrate test lint typecheck build api-client check design-reference'
	@echo 'Options: PYTHON=python3.12 ENV=development|production ENV_FILE=/path/to/.env SERVICE=api'
install:
	test -x $(VENV)/bin/python || $(PYTHON) -m venv $(VENV)
	@if $(VENV)/bin/python -m pip --version >/dev/null 2>&1; then \
	  $(VENV)/bin/python -m pip install -r $(ROOT)/Backend/requirements.lock && \
	  $(VENV)/bin/python -m pip install --no-deps -e '$(ROOT)/Backend[dev]'; \
	else \
	  $(VENV)/bin/python -m ensurepip --upgrade && \
	  $(VENV)/bin/python -m pip install -r $(ROOT)/Backend/requirements.lock && \
	  $(VENV)/bin/python -m pip install --no-deps -e '$(ROOT)/Backend[dev]'; \
	fi
	cd $(ROOT)/Frontend && npm ci
up:
	$(COMPOSE) up -d --build --wait --wait-timeout 300
down:
	$(COMPOSE) down
logs:
	$(COMPOSE) logs --follow --tail=100 $(SERVICE)
migrate:
	$(COMPOSE) exec -T api alembic -c alembic.ini upgrade head
test:
	cd $(ROOT)/Backend && $(VENV)/bin/python -m pytest
	cd $(ROOT)/Frontend && npm run test
lint:
	cd $(ROOT)/Backend && $(VENV)/bin/ruff check .
	cd $(ROOT)/Frontend && npm run lint
typecheck:
	cd $(ROOT)/Backend && $(VENV)/bin/python -m mypy src
	cd $(ROOT)/Frontend && npm run typecheck
build:
	$(COMPOSE) build api worker web
api-client:
	cd $(ROOT)/Backend && PYTHONPATH=src $(VENV)/bin/python scripts/export_openapi.py
	cd $(ROOT)/Frontend && npx --no-install openapi-typescript ../packages/api-client/openapi.json -o ../packages/api-client/schema.d.ts
check: test lint typecheck
design-reference:
	cd $(ROOT)/design-reference && npm ci && npm run dev -- --host 127.0.0.1
