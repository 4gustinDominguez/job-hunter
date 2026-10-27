import type { ApplicationStatus } from "@/domain/application/enums";
import type { MatchClassification, AnalysisState } from "@/domain/matching/job-analysis";
import type { JobSourceType } from "@/domain/job/enums";
import type { RemoteType } from "@/domain/job/enums";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  DISCOVERED: "bg-paper text-muted border-line",
  INTERESTED: "bg-info-soft text-info border-info/20",
  ANALYZED: "bg-info-soft text-info border-info/20",
  APPLICATION_READY: "bg-warn-soft text-warn border-warn/20",
  APPLIED: "bg-accent-soft text-accent-strong border-accent/20",
  FOLLOW_UP: "bg-warn-soft text-warn border-warn/20",
  INTERVIEW: "bg-accent-soft text-accent-strong border-accent/20",
  OFFER: "bg-accent text-white border-accent",
  REJECTED: "bg-danger-soft text-danger border-danger/20",
  WITHDRAWN: "bg-paper text-muted border-line",
};

const FIT_STYLES: Record<MatchClassification, string> = {
  STRONG: "bg-accent text-white border-accent",
  POTENTIAL: "bg-info-soft text-info border-info/20",
  WEAK: "bg-warn-soft text-warn border-warn/20",
  NONE: "bg-paper text-muted border-line",
};

const FIT_LABELS: Record<MatchClassification, string> = {
  STRONG: "strong fit",
  POTENTIAL: "potential",
  WEAK: "weak",
  NONE: "no match",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

export function FitBadge({ classification }: { classification: MatchClassification }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${FIT_STYLES[classification]}`}
    >
      {FIT_LABELS[classification]}
    </span>
  );
}

export function FitStateBadge({ state }: { state: AnalysisState }) {
  if (state === "done") return null;
  const label = state === "pending" ? "queued" : state === "failed" ? "analysis failed" : "fit?";
  return (
    <span
      title={
        state === "pending"
          ? "Waiting for the analysis batch (pnpm analyze-jobs)"
          : state === "failed"
            ? "Last analysis failed — retry from the job page"
            : "Not analyzed yet"
      }
      className="inline-block rounded-full border border-dashed border-line px-2 py-0.5 text-xs text-muted opacity-60"
    >
      {label}
    </span>
  );
}

export function SourceBadge({ source }: { source: JobSourceType }) {
  return (
    <span className="inline-block rounded-full border border-line bg-paper px-2 py-0.5 font-mono text-xs text-muted">
      {source.toLowerCase()}
    </span>
  );
}

export function RemoteBadge({ remoteType }: { remoteType?: RemoteType }) {
  if (!remoteType) return null;
  const label = remoteType === "ONSITE" ? "on-site" : remoteType.toLowerCase();
  return (
    <span className="inline-block rounded-full border border-line px-2 py-0.5 text-xs text-muted">
      {label}
    </span>
  );
}

/**
 * Attribution required by source terms of use (Himalayas demands a visible
 * link; Remotive/Arbeitnow/WWR ask for credit). Rendered next to the source
 * badge on the job detail page, where Apply lives.
 */
export const SOURCE_ATTRIBUTION: Partial<Record<JobSourceType, { href: string; label: string }>> = {
  REMOTIVE: { href: "https://remotive.com", label: "remotive.com" },
  ARBEITNOW: { href: "https://www.arbeitnow.com", label: "arbeitnow.com" },
  HIMALAYAS: { href: "https://himalayas.app", label: "himalayas.app" },
  WWR: { href: "https://weworkremotely.com", label: "weworkremotely.com" },
};

export function SourceAttributionLink({ source }: { source: JobSourceType }) {
  const attribution = SOURCE_ATTRIBUTION[source];
  if (!attribution) return null;
  return (
    <a
      href={attribution.href}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs text-muted hover:text-accent-strong hover:underline"
    >
      via {attribution.label}
    </a>
  );
}
