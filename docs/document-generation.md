# Document Generation

## Overview

The system generates tailored application documents based on the candidate profile and specific job requirements. All generated content must be derived from truthful candidate information.

## Document Types

### Tailored CV

A customized version of the candidate's CV for a specific position.

**Purpose**: Emphasize relevant experience, not fabricate new information.

**Allowed operations**:

- Reorder relevant skills
- Emphasize relevant experience
- Rephrase existing achievements
- Select relevant projects
- Adjust professional summary
- Remove irrelevant information

**Prohibited operations**:

- Add new skills or experience
- Invent achievements or metrics
- Modify employment history
- Create false qualifications

### Cover Letter

A tailored letter specific to the position.

**Requirements**:

- Be specific to the position
- Use only truthful candidate information
- Avoid generic AI-style language
- Avoid claiming unestablished knowledge
- Be editable before submission

**Input sources**:

```
Candidate profile
        +
Job description
        +
Company information
        ↓
Tailored cover letter
```

### Application Email

For positions accepting email applications.

**Generated components**:

- Recipient
- Subject line
- Email body
- CV attachment (tailored version)
- Cover letter attachment

## Generation Flow

```
Job
 ↓
Generate application
 ↓
Generate email
 ↓
Attach tailored CV
 ↓
Attach cover letter
 ↓
Human review
 ↓
Send
```

## AI Provider Abstraction

Document generation uses an abstracted AI service:

```typescript
interface AiService {
  generateCoverLetter(job: Job, candidate: CandidateProfile): Promise<CoverLetter>;

  tailorCv(job: Job, candidate: CandidateProfile): Promise<TailoredCv>;
}
```

## Versioning

Every generated document must:

- Be associated with the job/application that produced it
- Reference the source profile data used
- Be stored for traceability
- Never modify the canonical profile

## Quality Guidelines

### CV Generation

- Maintain professional tone
- Highlight relevant technical skills
- Emphasize applicable experience
- Keep concise and focused

### Cover Letter Generation

- Address specific job requirements
- Reference relevant company information
- Show genuine interest
- Avoid clichés and generic phrases

### Email Generation

- Professional subject line
- Clear, concise body
- Proper formatting
- Appropriate tone

## Review Process

All generated documents require human review before:

- Sending via email
- Submitting through platforms
- Uploading to external systems

## Output Formats

- **CV**: PDF (primary), Markdown (editable)
- **Cover Letter**: PDF (primary), Markdown (editable)
- **Email**: Plain text, HTML

## Configuration

AI provider settings:

```
AI_PROVIDER=openai
AI_MODEL=gpt-4
AI_TEMPERATURE=0.7
```

## Related Documentation

- [Candidate Profile](./candidate-profile.md)
- [Job Matching](./job-matching.md)
- [Application Management](./application-management.md)
