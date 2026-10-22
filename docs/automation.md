# Automation

## Overview

Automation is introduced progressively, prioritizing reliability over maximum automation. The system keeps the candidate in control of final decisions.

## Automation Levels

### Level 1 — Discovery (Fully Automated)

```
Scheduled search
    ↓
Fetch jobs
    ↓
Normalize
    ↓
Deduplicate
    ↓
Analyze
    ↓
Notify
```

**Automated tasks**:

- Scheduled job searches
- Fetching from multiple sources
- Normalizing job data
- Deduplicating listings
- Basic matching analysis
- Notification of new matches

### Level 2 — Application Preparation (Mostly Automated)

```
Job
 ↓
Match
 ↓
Generate CV
 ↓
Generate cover letter
 ↓
Generate email
 ↓
Human review
```

**Automated tasks**:

- Job-candidate matching
- Tailored CV generation
- Cover letter generation
- Email draft creation

**Requires review**:

- All generated documents
- Final application content

### Level 3 — Submission (Potentially Automated)

```
Open application
 ↓
Fill form
 ↓
Upload documents
 ↓
Human confirmation
 ↓
Submit
```

**Status**: Future consideration, subject to platform terms.

**Notes**:

- Browser automation treated as optional integration
- Not a core dependency
- Requires explicit user authorization

## Scheduled Jobs

The system supports background task scheduling:

### Daily Tasks

```
Every morning:
    Fetch new positions

Daily:
    Generate job summary

Daily:
    Check follow-ups
```

### Periodic Tasks

```
Every few hours:
    Check selected sources

Periodically:
    Check application status where possible
```

## Implementation Guidelines

### Decoupling

Scheduling should be decoupled from business logic:

- Use job queues or task schedulers
- Business logic remains testable
- Scheduling is infrastructure concern

### Configuration

```
SCHEDULE_ENABLED=true
FETCH_INTERVAL=0 8 * * *
SUMMARY_TIME=09:00
FOLLOW_UP_CHECK=18:00
```

### Error Handling

- Retry failed tasks with exponential backoff
- Log failures for investigation
- Continue processing other tasks
- Notify user of critical failures

## Notifications

### Event Types

- New strong match found
- Application ready for review
- Follow-up due
- Interview approaching
- Application status changed

### Channels

- Email (primary)
- Web application dashboard
- Future messaging integrations

### Daily Summary

```
Good morning

23 new positions found.

5 strong matches
11 possible matches
7 low matches

Top opportunities:

Senior Full Stack Developer — Company A
Frontend Engineer — Company B
Software Engineer — Company C
```

## Safety Measures

### Human Approval Required

- Sending emails
- Submitting applications
- Uploading documents externally
- Finalizing generated content

### Rate Limiting

- Respect API rate limits
- Implement exponential backoff
- Monitor usage costs
- Alert on unusual patterns

## Future Enhancements

- Browser automation for form filling
- Automatic application submission (with approval)
- Application status detection
- Advanced analytics and reporting
- Multi-channel notifications

## Related Documentation

- [Application Management](./application-management.md)
- [Architecture](./architecture.md)
- [Development Guide](./development-guide.md)
