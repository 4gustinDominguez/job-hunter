import type { ApplicationStatus } from "@/domain/application/enums";

export const APPLICATION_STATUS_TRANSITIONS: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  DISCOVERED: ["INTERESTED", "WITHDRAWN"],
  INTERESTED: ["ANALYZED", "WITHDRAWN"],
  ANALYZED: ["APPLICATION_READY", "INTERESTED", "WITHDRAWN"],
  APPLICATION_READY: ["APPLIED", "ANALYZED", "WITHDRAWN"],
  APPLIED: ["FOLLOW_UP", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"],
  FOLLOW_UP: ["INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"],
  INTERVIEW: ["OFFER", "REJECTED", "WITHDRAWN"],
  OFFER: ["WITHDRAWN"],
  REJECTED: [],
  WITHDRAWN: [],
};

export function allowedTransitions(from: ApplicationStatus): readonly ApplicationStatus[] {
  return APPLICATION_STATUS_TRANSITIONS[from];
}

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return allowedTransitions(from).includes(to);
}
