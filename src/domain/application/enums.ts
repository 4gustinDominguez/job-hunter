export const APPLICATION_STATUSES = [
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

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
