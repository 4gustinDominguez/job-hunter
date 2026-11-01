.PHONY: help install setup run up down logs dev build start lint format format-check typecheck test fetch analyze db-generate db-migrate db-seed db-studio

# Bare `make` lists the targets instead of silently starting Docker.
.DEFAULT_GOAL := help

# ── Help ────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# ── Setup (first run) ───────────────────────────────────
install: ## Install dependencies
	pnpm install

setup: ## First run: install deps, create .env if missing, start DB, migrate
	pnpm install
	[ -f .env ] || cp .env.example .env
	docker compose up -d --wait
	pnpm db:migrate

# ── Run (bring the project up) ──────────────────────────
run: ## Start DB (wait for health), migrate, then the dev server
	docker compose up -d --wait
	pnpm db:migrate
	pnpm dev

# ── Docker ──────────────────────────────────────────────
up: ## Start local services (Postgres)
	docker compose up -d

down: ## Stop local services
	docker compose down

logs: ## Tail Postgres logs
	docker compose logs -f db

# ── App ─────────────────────────────────────────────────
dev: ## Start Next.js dev server
	pnpm dev

build: ## Production build
	pnpm build

start: ## Start production server
	pnpm start

# ── Jobs ────────────────────────────────────────────────
fetch: ## Ingest job offers from the enabled sources
	pnpm fetch-jobs

analyze: ## Run the LLM fit-analysis batch
	pnpm analyze-jobs

# ── Quality ─────────────────────────────────────────────
lint: ## Run oxlint
	pnpm lint

format: ## Format with oxfmt
	pnpm format

format-check: ## Check formatting
	pnpm format:check

typecheck: ## TypeScript check
	pnpm typecheck

test: ## Run tests (Vitest)
	pnpm test

# ── Database ────────────────────────────────────────────
db-generate: ## Generate Drizzle migrations
	pnpm db:generate

db-migrate: ## Apply migrations to the DB in DATABASE_URL
	pnpm db:migrate

db-seed: ## Seed local DB with sample data (wipes jobs/applications)
	pnpm db:seed

db-studio: ## Open Drizzle Studio
	pnpm db:studio
