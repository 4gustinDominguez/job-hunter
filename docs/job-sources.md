# Job Sources

## Overview

Job sources are external platforms where job listings are discovered. The system abstracts these behind a common interface to enable easy addition or removal of providers.

## Provider Abstraction

All job sources implement a common interface:

```typescript
interface JobSource {
  search(criteria: JobSearchCriteria): Promise<Job[]>;
}
```

This ensures:

- Application logic remains provider-agnostic
- Adding new sources requires only a new implementation
- Testing can use mock implementations

## Initial Sources

### Adzuna API

- **Type**: REST API
- **Authentication**: API key
- **Coverage**: Global (varies by country)
- **Features**: Search by keywords, location, salary range

### Jooble API

- **Type**: REST API
- **Authentication**: API key
- **Coverage**: Global
- **Features**: Aggregates from multiple sources

### Company Career Pages

- **Type**: Web scraping or RSS (case-by-case)
- **Authentication**: Varies
- **Coverage**: Specific companies
- **Features**: Direct access to company openings

### Other Sources

- Public job feeds
- RSS feeds
- GraphQL APIs
- Future integrations as needed

## Implementation Pattern

```
infrastructure/
└── job-sources/
    ├── adzuna/
    │   ├── adzuna-job-source.ts
    │   ├── adzuna-client.ts
    │   └── adzuna-mapper.ts
    ├── jooble/
    │   ├── jooble-job-source.ts
    │   ├── jooble-client.ts
    │   └── jooble-mapper.ts
    └── index.ts
```

Each provider should:

1. Implement `JobSource` interface
2. Handle provider-specific authentication
3. Map external responses to normalized `Job` format
4. Handle rate limits and errors gracefully
5. Log external IDs for deduplication

## Deduplication

Jobs from multiple sources may represent the same position. The system deduplicates using:

1. Canonical application URL
2. External job ID
3. Company name
4. Job title
5. Location
6. Description similarity

Original sources are preserved for traceability.

## Error Handling

Providers should handle:

- Rate limiting (respect retry headers)
- Network failures (graceful degradation)
- Missing fields (use defaults or skip)
- Malformed responses (log and skip)
- Authentication failures (clear error messages)

## Adding a New Source

1. Create directory in `infrastructure/job-sources/`
2. Implement `JobSource` interface
3. Add mapper to convert to normalized format
4. Register in provider index
5. Add tests for the new implementation
6. Update configuration for API keys

## Configuration

API keys and source-specific settings should be stored in environment variables:

```
ADZUNA_APP_ID=xxx
ADZUNA_APP_KEY=xxx
JOOBLE_API_KEY=xxx
```

## Related Documentation

- [Domain Model](./domain-model.md)
- [Architecture](./architecture.md)
- [Development Guide](./development-guide.md)
