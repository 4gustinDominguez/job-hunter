# Application Management

## Overview

Every application is tracked independently from the original job listing. The system maintains a complete history of all interactions and documents associated with each application.

## Data Model

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

## Application Status

Applications follow a defined state machine:

```
DISCOVERED
    ↓
INTERESTED
    ↓
ANALYZED
    ↓
APPLICATION_READY
    ↓
APPLIED
    ↓
FOLLOW_UP
    ↓
INTERVIEW
    ↓
OFFER
    ↓
REJECTED / WITHDRAWN
```

### Status Definitions

| Status            | Description                            |
| ----------------- | -------------------------------------- |
| DISCOVERED        | Job found, not yet reviewed            |
| INTERESTED        | Candidate expressed interest           |
| ANALYZED          | Matching analysis completed            |
| APPLICATION_READY | Documents generated, pending review    |
| APPLIED           | Application submitted                  |
| FOLLOW_UP         | Awaiting response, follow-up scheduled |
| INTERVIEW         | Interview scheduled or completed       |
| OFFER             | Job offer received                     |
| REJECTED          | Application rejected                   |
| WITHDRAWN         | Candidate withdrew application         |

## Features

### Status Tracking

- Track current status and history
- Record timestamps for each transition
- Maintain audit trail

### Document Association

Each application links to:

- CV version used
- Cover letter version used
- Email version sent (if applicable)

### Follow-Up Management

The system identifies applications requiring follow-up:

```
Application
    ↓
Applied 8 days ago
    ↓
No response
    ↓
Follow-up candidate
```

Follow-up capabilities:

- Generate follow-up email/message
- Schedule reminders
- Track follow-up history

### Notes

Applications support free-form notes:

- Interview feedback
- Contact information
- Personal observations
- Next steps

## Dashboard

The dashboard provides an overview:

```
JOB HUNTER

New jobs today                 37
Strong matches                  8
Applications ready             12
Applied this week              17
Interviews                      2
```

### Navigation

- Jobs
- Applications
- Companies
- Contacts
- Documents
- Search Profiles
- Settings

## Human-in-the-Loop

The following operations require explicit user approval:

- Sending an email
- Submitting an application
- Publishing or uploading information externally
- Finalizing a generated CV
- Finalizing a cover letter

## Contacts

Track people associated with applications:

```typescript
interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  linkedin?: string;
  notes?: string[];
}
```

## Metrics

Track application metrics:

- Applications by status
- Response rates
- Interview conversion
- Time to response
- Follow-up effectiveness

## Related Documentation

- [Domain Model](./domain-model.md)
- [Document Generation](./document-generation.md)
- [Automation](./automation.md)
