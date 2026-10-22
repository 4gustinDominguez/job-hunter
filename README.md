# Job Hunter

A personal job-search assistant for an active hunt: **real offers in, transparent fit analysis, tailored application documents out — with a human in the loop at every step.**

Built as a personal tool, designed and engineered to production habits: hexagonal architecture, typed end to end, migrations, a 250-test suite and CI-ready gates.

## What it does

```
CV (PDF) ──► structured profile (AI extraction, human review)
                 │
Portals ──────► offers ──► dedup ──► cheap local prefilter ──► LLM fit analysis (batch)
 (Remotive,        │                                            │
  Arbeitnow)       │                                            ▼
                   │                          Strong / Potential / Weak / No match
                   │                          with matched skills, gaps & reasoning
                   ▼
        Application pipeline (status + notes)
                   │
                   ▼
        Tailored cover letter + tailored CV (LLM) ──► edit ──► copy / print
```

- **Profile from CV**: upload a PDF, get a prefilled, editable profile. Deterministic facts (email, phone, skills) come from regex; the model only does the judgment work. The original PDF stays on record and is viewable.
- **Real offers**: Remotive (remote, keyless) and Arbeitnow (Europe, keyless) ingested through a source-adapter abstraction with URL/content deduplication.
- **Fit analysis**: a deterministic, zero-cost prefilter decides which offers deserve an LLM call; a batch job stores a transparent analysis per offer — classification plus matched skills, gaps, unknowns and plain-language reasoning (no opaque score).
- **Documents**: cover letter and tailored CV generated under a strict allow/deny contract (reorder and emphasize — never invent), with a warning heuristic for unsupported claims and mandatory human review before anything is sent.
- **Auth & cron**: single-user login (scrypt + JWT session cookie + proxy gate), scheduled fetch via Vercel cron.

Everything is review-first: nothing is ever submitted automatically.

## Stack

| Layer             | Choice                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Framework         | Next.js 16 (App Router, Server Actions, `proxy.ts`) · React 19 · TypeScript                                              |
| Data              | PostgreSQL + Drizzle ORM (typed migrations)                                                                              |
| Styling           | Tailwind CSS 4                                                                                                           |
| AI                | Ollama (local or free cloud models) with an OpenAI-compatible fallback (HuggingFace router) behind one `ChatClient` port |
| Validation        | Zod                                                                                                                      |
| Testing / quality | Vitest · oxlint · oxfmt                                                                                                  |
| Tooling           | pnpm · Docker (local PG) · Makefile                                                                                      |

## Architecture

Hexagonal (ports & adapters) with strict layering — the UI talks to use cases, use cases to ports, infrastructure implements them:

```
src/
├── domain/          # pure types & rules (Job, CandidateProfile, JobAnalysis, dedup…)
├── application/     # use cases + ports (IngestJobs, AnalyzeJobFit, GenerateDocument…)
├── infrastructure/  # Drizzle repos, job-source adapters, PDF, AI clients
└── app/             # Next.js routes, server actions, composition root (container.ts)
```

Design docs in [`docs/`](./docs): [architecture](./docs/architecture.md) · [domain model](./docs/domain-model.md) · [job matching](./docs/job-matching.md) · [document generation](./docs/document-generation.md) · [job sources](./docs/job-sources.md) · [development guide](./docs/development-guide.md).

## Getting started

Requirements: Node 24+, pnpm, Docker (local Postgres).

```bash
pnpm install
cp .env.example .env        # then fill in the AUTH_* vars (see below)
make up                     # local Postgres
pnpm db:migrate && pnpm db:seed
pnpm dev
```

Useful scripts:

```bash
pnpm test            # 250 unit tests
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build   # full gate
pnpm fetch-jobs      # ingest offers from the enabled sources + run the prefilter
pnpm analyze-jobs    # run the LLM fit-analysis batch (bounded per run)
pnpm auth:hash "pw"  # generate AUTH_PASSWORD_HASH
```

### Environment

`.env.example` documents every variable. The important ones:

- `DATABASE_URL` — Postgres connection string (local Docker or Supabase pooler in production).
- `AI_PROVIDER` / `OLLAMA_MODEL` — AI backend for extraction, analysis and documents.
- `AUTH_USERNAME` / `AUTH_PASSWORD_HASH` / `AUTH_SECRET` — required for login (the app is behind a single-user login in production).
- `CRON_SECRET` — protects `/api/cron/fetch-jobs`.

## AI notes

One provider abstraction powers CV extraction, fit analysis and document generation. Prompts carry an explicit anti-fabrication contract; outputs are Zod-validated with coercion for common model drift and bounded retries. Cost is managed by a local deterministic prefilter and batch caps.

What leaves your machine depends on your provider choice: with a local model, nothing; with Ollama's free cloud models, the job postings (public data) and relevant profile excerpts. See `.env.example`.

## License

[MIT](./LICENSE)
