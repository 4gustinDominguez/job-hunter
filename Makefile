.PHONY: up down logs dev build start lint format format-check typecheck test db-generate db-migrate db-seed db-studio

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

db-migrate: ## Apply migrations to local DB
	pnpm db:migrate

db-seed: ## Seed local DB with sample data
	pnpm db:seed

db-studio: ## Open Drizzle Studio
	pnpm db:studio
