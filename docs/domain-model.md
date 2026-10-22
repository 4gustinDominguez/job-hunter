# Domain Model

## Core Entities

### Job

Represents a normalized job listing from any source.

```typescript
interface Job {
  id: string;
  source: JobSourceType;
  externalId?: string;
  url: string;
  title: string;
  company: Company;
  location?: Location;
  remoteType?: RemoteType;
  description: string;
  salary?: SalaryRange;
  employmentType?: EmploymentType;
  publishedAt?: Date;
  discoveredAt: Date;
  skills?: string[];
}
```

### Company

Represents an employer or organization.

```typescript
interface Company {
  id: string;
  name: string;
  url?: string;
  description?: string;
  industry?: string;
  size?: string;
  location?: Location;
}
```

### Application

Tracks the candidate's interaction with a job opportunity.

```typescript
interface Application {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  appliedAt?: Date;
  cvVersion?: string;
  coverLetterVersion?: string;
  emailVersion?: string;
  contact?: Contact;
  notes?: string[];
  nextActionAt?: Date;
}
```

### CandidateProfile

The candidate's professional information (source of truth).

```typescript
interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: Location;
  summary?: string;
  experience: Experience[];
  skills: Skill[];
  projects: Project[];
  education: Education[];
  preferences: JobPreferences;
}
```

### SearchProfile

Defines criteria for job searches.

```typescript
interface JobSearchProfile {
  id: string;
  name: string;
  keywords: string[];
  locations: string[];
  remotePreference?: RemotePreference;
  employmentTypes?: EmploymentType[];
  seniority?: Seniority[];
  salary?: {
    minimum?: number;
    currency?: string;
  };
  excludedCompanies?: string[];
  excludedKeywords?: string[];
}
```

## Value Objects

### Location

```typescript
interface Location {
  city?: string;
  region?: string;
  country?: string;
  isRemote: boolean;
}
```

### SalaryRange

```typescript
interface SalaryRange {
  minimum?: number;
  maximum?: number;
  currency: string;
  period: "hourly" | "monthly" | "yearly";
}
```

### Enumerations

Enumerations are defined as const arrays plus union types (Drizzle-friendly, no reverse mapping, `isolatedModules`-safe):

```typescript
const JOB_SOURCE_TYPES = [
  "ADZUNA",
  "JOOBLE",
  "COMPANY_CAREER",
  "FIXTURE",
  "REMOTIVE",
  "ARBEITNOW",
  "OTHER",
] as const;
type JobSourceType = (typeof JOB_SOURCE_TYPES)[number];

const APPLICATION_STATUSES = [
  "DISCOVERED",
  "INTERESTED",
  "ANALYZED",
  "APPLICATION_READY",
  "APPLIED",
  "FOLLOW_UP",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;
type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const REMOTE_TYPES = ["ONSITE", "REMOTE", "HYBRID"] as const;
type RemoteType = (typeof REMOTE_TYPES)[number];

const REMOTE_PREFERENCES = ["ANY", "ONSITE", "HYBRID", "REMOTE"] as const;
type RemotePreference = (typeof REMOTE_PREFERENCES)[number];

const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"] as const;
type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

const SENIORITIES = ["JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL"] as const;
type Seniority = (typeof SENIORITIES)[number];

const SKILL_CATEGORIES = ["PROGRAMMING", "FRAMEWORK", "TOOL", "SOFT_SKILL", "LANGUAGE"] as const;
type SkillCategory = (typeof SKILL_CATEGORIES)[number];

const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
type SkillLevel = (typeof SKILL_LEVELS)[number];

const SALARY_PERIODS = ["hourly", "monthly", "yearly"] as const;
type SalaryPeriod = (typeof SALARY_PERIODS)[number];
```

## Relationships

```
Job ─────────┬──────── Application
             │              │
             │              │
Company ─────┘              │
                            │
CandidateProfile ───────────┘
             │
SearchProfile
```

- A Job belongs to one Company
- An Application links a Job to the CandidateProfile
- SearchProfiles are used to discover Jobs
- Multiple Applications can reference the same Job (reapplication scenario)

## Invariants

1. Every Job must have a source and URL
2. Application status must follow the defined state machine
3. CandidateProfile is the authoritative source for application generation
4. Generated documents must reference the Job and Application that produced them
5. No data in CandidateProfile should be auto-generated or fabricated

## Related Documentation

- [Architecture](./architecture.md)
- [Candidate Profile](./candidate-profile.md)
- [Application Management](./application-management.md)
- [Job Matching](./job-matching.md)
