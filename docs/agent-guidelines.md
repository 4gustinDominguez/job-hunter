# Agent Guidelines

## Overview

This document provides guidelines for AI agents working on the Job Hunter project. Following these guidelines ensures consistency and maintains the project's architectural integrity.

## Core Principles

### 1. Read Before Writing

Always read relevant documentation before making architectural decisions:

- [Architecture](./architecture.md)
- [Domain Model](./domain-model.md)
- [Development Guide](./development-guide.md)

### 2. Prefer Existing Abstractions

Use existing interfaces and patterns rather than introducing provider-specific logic:

```typescript
// Good: Use abstraction
interface JobSource {
  search(criteria: JobSearchCriteria): Promise<Job[]>;
}

// Bad: Direct provider dependency
class SomeService {
  constructor(private adzunaClient: AdzunaClient) {}
}
```

### 3. Avoid Unnecessary Dependencies

- Only add dependencies that provide clear value
- Prefer standard library solutions when possible
- Document reasons for new dependencies

### 4. Keep Domain Logic Independent

Domain logic should not depend on:

- Frameworks
- External services
- Infrastructure implementations

### 5. Never Invent Candidate Information

- Use only data from the candidate profile
- Do not fabricate experience, skills, or achievements
- All generated content must be traceable to source data

### 6. Require Human Approval

Do not automatically:

- Send emails
- Submit applications
- Upload documents externally
- Finalize generated content

### 7. Maintain Traceability

Every generated document must reference:

- The job that produced it
- The application associated with it
- The source profile data used

### 8. Add Meaningful Tests

Test:

- Domain logic
- Application use cases
- Integration boundaries
- Error handling

### 9. Prefer Simple Solutions

- Avoid premature abstraction
- Choose readable implementations
- Refactor when patterns emerge
- Keep solutions focused

### 10. Treat External APIs as Unreliable

Handle:

- Rate limits
- Network failures
- Missing fields
- Malformed responses
- Duplicate data

## Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use enums for fixed sets of values
- Document complex types

### File Organization

Follow the project structure:

```
src/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Interfaces**: `PascalCase` (prefixed with `I` if needed)
- **Enums**: `PascalCase` with `UPPER_CASE` values
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

## Provider Implementation

When adding a new provider:

1. Create directory in `infrastructure/`
2. Implement domain interfaces
3. Handle errors gracefully
4. Add comprehensive tests
5. Document configuration
6. Update provider index

## Review Checklist

Before submitting changes:

- [ ] Code follows existing patterns
- [ ] Domain logic is independent
- [ ] External dependencies are abstracted
- [ ] Error handling is comprehensive
- [ ] Tests are included
- [ ] Documentation is updated
- [ ] No candidate information is fabricated
- [ ] Human approval is required for external actions

## Related Documentation

- [Architecture](./architecture.md)
- [Domain Model](./domain-model.md)
- [Development Guide](./development-guide.md)
