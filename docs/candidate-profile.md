# Candidate Profile

## Overview

The candidate profile is the authoritative source of truth for the candidate's professional information. All generated application documents must derive from this data.

## Structure

```
profile/
├── cv.md
├── experience.md
├── skills.md
├── projects.md
├── education.md
└── preferences.md
```

## Data Model

### Personal Information

```typescript
interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: Location;
  summary?: string;
}
```

### Experience

```typescript
interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date; // null = current
  description: string;
  achievements: string[];
  skills: string[];
}
```

### Skills

```typescript
interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsOfExperience?: number;
  lastUsed?: Date;
}

enum SkillCategory {
  PROGRAMMING = "PROGRAMMING",
  FRAMEWORK = "FRAMEWORK",
  TOOL = "TOOL",
  SOFT_SKILL = "SOFT_SKILL",
  LANGUAGE = "LANGUAGE",
}

enum SkillLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
  EXPERT = "EXPERT",
}
```

### Projects

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  url?: string;
  technologies: string[];
  highlights: string[];
}
```

### Education

```typescript
interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  achievements?: string[];
}
```

### Preferences

```typescript
interface JobPreferences {
  desiredRoles: string[];
  desiredLocations: string[];
  remotePreference: RemotePreference;
  salaryExpectation?: {
    minimum: number;
    currency: string;
  };
  excludedCompanies: string[];
  employmentTypes: EmploymentType[];
}
```

## Rules

### Data Ownership

- Candidate profile is user-owned data
- Must be manually maintained or explicitly approved
- System must **never** invent or fabricate information

### Canonical Source

- Profile data is the single source of truth
- Generated documents reference this data
- Changes to profile propagate to future applications

### Immutability of History

- Historical experience should not be altered
- Generated CVs may reorder or rephrase, but not fabricate
- Every generated version must be traceable to its source

## Management

The profile should be editable through:

- Web interface (primary)
- Direct file editing (for technical users)
- API endpoints (for automation)

## Validation

Profile data should be validated:

- Required fields: name, email
- Experience dates should be logical
- Skills should have valid categories
- Preferences should have valid values

## Related Documentation

- [Domain Model](./domain-model.md)
- [Document Generation](./document-generation.md)
- [Job Matching](./job-matching.md)
