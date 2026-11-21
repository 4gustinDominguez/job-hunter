export type AtsSeverity = "critical" | "warning" | "info";
export type AtsRating = "Excellent" | "Good" | "Fair" | "Poor" | "Needs Improvement";

export interface AtsIssue {
  severity: AtsSeverity;
  message: string;
  /** Where to fix it: "basics.email", "work[0].startDate", "cv"… */
  field?: string;
}

export interface AtsCheck {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  issues: AtsIssue[];
}

export interface AtsReport {
  /** Normalized 0-100. */
  score: number;
  rating: AtsRating;
  checks: AtsCheck[];
  recommendations: AtsIssue[];
  summary: string;
}
