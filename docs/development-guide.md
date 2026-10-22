# Development Guide

## Overview

This guide covers the development approach, setup, and conventions for the Job Hunter project.

## Development Approach

Development should be incremental. Each feature should ideally be implemented as an independently testable use case.

## Recommended Order

```
1. Project setup
2. Domain model
3. Database
4. Job source abstraction
5. First job provider
6. Job ingestion
7. Deduplication
8. Search/filtering
9. Candidate profile
10. Job matching
11. AI integration
12. Document generation
13. Application management
14. Email integration
15. Notifications
16. Automation
```

## MVP Phases

### Phase 1

- User profile
- Search profiles
- Job source integration
- Job normalization
- Job persistence
- Deduplication
- Basic filtering
- Job detail page
- Application tracking

### Phase 2

- Job/profile matching
- AI-assisted analysis
- Tailored CV generation
- Cover letter generation

### Phase 3

- Email integration
- Application email generation
- Daily job digest
- Follow-up reminders

### Later

- Browser automation
- Automatic application form filling
- Additional job sources
- Company research
- Application status detection
- Analytics

## Project Setup

### Prerequisites

- Node.js (LTS version)
- pnpm (package manager)
- PostgreSQL database
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd job-hunter

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start local PostgreSQL (Docker)
make up

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

## Environment Variables

```
# Database
DATABASE_URL=postgresql://...

# Job Sources
ADZUNA_APP_ID=xxx
ADZUNA_APP_KEY=xxx
JOOBLE_API_KEY=xxx

# AI Provider
AI_PROVIDER=openai
AI_API_KEY=xxx
AI_MODEL=gpt-4

# Email (optional)
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=xxx
EMAIL_PASS=xxx
```

## Commands

The project exposes a `Makefile` at the repository root as the main entry point:

```bash
# Infrastructure
make up               # Start local services (Postgres via Docker)
make down             # Stop local services
make logs             # Tail Postgres logs

# Development
make dev              # Start dev server
make build            # Build for production
make start            # Start production server

# Quality
make lint             # Run oxlint
make format           # Format with oxfmt
make format-check     # Check formatting
make typecheck        # TypeScript check
make test             # Run tests (Vitest)

# Database
make db-generate      # Generate Drizzle migrations
make db-migrate       # Apply migrations
make db-seed          # Seed local DB with sample data
make db-studio        # Open Drizzle Studio
```

The same actions are available as package scripts (`pnpm <script>`):

```bash
pnpm dev | build | start
pnpm lint | format | format:check | typecheck
pnpm test | test:watch
pnpm db:generate | db:migrate | db:seed | db:studio
```

## Code Conventions

### TypeScript

- Strict mode enabled
- Use interfaces for object shapes
- Prefer `unknown` over `any`
- Use discriminated unions for state

### File Structure

- One export per file
- Tests live in `tests/` (repo root), mirroring the `src/` structure (e.g. `src/domain/job/dedup.ts` → `tests/domain/job/dedup.test.ts`)
- Use index files for barrel exports
- Keep files under 300 lines

### Testing

- Unit tests for domain logic
- Integration tests for use cases
- E2E tests for critical paths
- Aim for meaningful coverage

## Architecture

Follow clean architecture principles:

- [Architecture](./architecture.md)
- [Domain Model](./domain-model.md)

## Provider Integration

When adding new providers:

- [Job Sources](./job-sources.md)
- [Agent Guidelines](./agent-guidelines.md)

## Related Documentation

- [Architecture](./architecture.md)
- [Domain Model](./domain-model.md)
- [Agent Guidelines](./agent-guidelines.md)
