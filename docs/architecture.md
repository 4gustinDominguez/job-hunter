# Architecture

## Overview

Job Hunter follows a clean architecture approach with clear separation of concerns. The system is designed to be maintainable, testable, and flexible enough to accommodate future changes.

## Directory Structure

```text
src/
├── app/                       # Presentation layer (Next.js App Router)
│   ├── layout.tsx
│   ├── page.tsx               # Dashboard
│   ├── jobs/
│   ├── applications/
│   ├── search-profiles/
│   └── profile/
│
├── domain/                    # Core business logic (no dependencies)
│   ├── job/
│   ├── company/
│   ├── application/
│   ├── candidate/
│   └── search/
│
├── application/               # Use cases + ports (interfaces)
│   ├── jobs/
│   ├── applications/
│   ├── matching/
│   ├── documents/
│   └── notifications/
│
└── infrastructure/            # Adapters (implementations of ports)
    ├── db/                    # Drizzle schema, client, migrations, seed
    ├── job-sources/
    │   ├── fixture/
    │   ├── adzuna/
    │   ├── jooble/
    │   └── ...
    ├── ai/
    ├── email/
    └── browser/
```

## Layers

### Domain Layer

Contains the core business logic and entities. This layer should:

- Be independent of frameworks and external services
- Define interfaces for infrastructure dependencies
- Contain business rules and validation

### Application Layer

Implements use cases and orchestrates domain objects. This layer should:

- Depend on domain interfaces, not concrete implementations
- Handle application-specific logic
- Coordinate between domain and infrastructure

### Infrastructure Layer

Provides concrete implementations of domain interfaces. This layer should:

- Isolate external dependencies (databases, APIs, services)
- Implement provider-specific logic
- Be replaceable without affecting domain logic

### Presentation Layer

Next.js App Router (`src/app/`): pages, layouts, and server actions. This layer should:

- Be thin and focused on presentation logic
- Delegate business logic to the application layer
- Call use cases directly from server components/server actions (no internal HTTP round-trips)

## Key Principles

### Dependency Inversion

High-level modules should not depend on low-level modules. Both should depend on abstractions.

```typescript
// Good: Application depends on abstraction
interface JobSource {
  search(criteria: JobSearchCriteria): Promise<Job[]>;
}

// Implementation in infrastructure
class AdzunaJobSource implements JobSource {
  // ...
}
```

### Provider Abstraction

External services should be abstracted behind interfaces:

- **Job Sources**: Adzuna, Jooble, custom sources
- **AI Services**: LLM providers for analysis and generation
- **Email Services**: Gmail, Outlook integration
- **Database**: Storage and persistence

### Separation of Concerns

Each module should have a single, well-defined responsibility:

- Domain entities represent business concepts
- Application services orchestrate workflows
- Infrastructure handles external integrations
- Presentation manages user interaction

## Technology Stack

- **Frontend**: Next.js / React with TypeScript (App Router)
- **Backend**: Node.js / TypeScript (server components + server actions)
- **Database**: PostgreSQL (local via Docker; managed via Supabase later)
- **ORM**: Drizzle ORM
- **AI**: LLM provider abstraction
- **Email**: Gmail / Outlook integration
- **Lint / Format**: oxlint / oxfmt
- **Tests**: Vitest
- **Background Jobs**: TBD

## Design Decisions

### Why Clean Architecture?

- Enables testing domain logic without infrastructure
- Makes provider switching straightforward
- Keeps business rules visible and maintainable
- Supports incremental feature development

### Why Provider Abstraction?

- Job platforms may change their APIs or terms
- AI providers may need to be swapped
- Email services may vary by deployment
- Reduces vendor lock-in

## Related Documentation

- [Domain Model](./domain-model.md)
- [Job Sources](./job-sources.md)
- [Development Guide](./development-guide.md)
