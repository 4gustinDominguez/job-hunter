# Job Matching

## Overview

Job matching analyzes how well a position aligns with the candidate's profile and preferences. The system exposes reasoning rather than reducing to a single opaque score.

## Matching Criteria

### Skills Match

Compare job requirements against candidate skills:

```typescript
interface SkillMatch {
  skill: string;
  candidateLevel?: SkillLevel;
  requiredLevel: SkillLevel;
  status: "matched" | "partial" | "missing" | "unknown";
}
```

### Experience Match

Evaluate relevant work experience:

- Years of experience in relevant technologies
- Similar roles or industries
- Relevant project work

### Location Match

Compare job location against preferences:

- Exact location match
- Remote work compatibility
- Hybrid arrangements

### Salary Match

Compare compensation expectations:

- Within acceptable range
- Above minimum threshold
- Currency considerations

## Output Format

The matching system produces transparent results:

```
Strong match

Matched:
✓ TypeScript
✓ React
✓ Node.js
✓ GraphQL
✓ REST APIs

Potential gaps:
- Kubernetes

Unknown:
- AWS

Experience:
✓ Full-stack development
✓ Web applications
✓ API development
```

## Classification

Matches are classified into categories:

- **Strong Match**: Most requirements met, clear fit
- **Potential Match**: Some gaps but worth considering
- **Weak Match**: Significant gaps or misalignment
- **No Match**: Fundamental misalignment

## AI-Assisted Analysis

The system may use AI to:

- Extract skills from job descriptions
- Compare unstructured requirements
- Identify implicit requirements
- Suggest potential gaps

### AI Provider Abstraction

```typescript
interface AiService {
  analyzeJob(job: Job, candidate: CandidateProfile): Promise<JobAnalysis>;
}
```

## Filtering

Search profiles define filtering criteria:

- Required keywords
- Location preferences
- Salary minimums
- Excluded companies
- Excluded keywords
- Employment types
- Seniority levels

## Score (Future Consideration)

A numerical score may be introduced if it provides practical value:

- Should remain transparent
- Underlying reasons must stay available
- Should not replace qualitative analysis

## Traceability

Every match should be explainable:

- Which requirements matched
- Which requirements are missing
- Which information was used
- Confidence level for each assessment

## Related Documentation

- [Domain Model](./domain-model.md)
- [Candidate Profile](./candidate-profile.md)
- [Document Generation](./document-generation.md)
