"use client";

import { useActionState } from "react";
import { runAtsCheckAction } from "@/app/_lib/actions";
import type { AtsCheckState } from "@/app/_lib/schemas";
import type { AtsCheck, AtsIssue, AtsReport } from "@/domain/ats/ats-report";

const initialState: AtsCheckState = {};

const SEVERITY_STYLES: Record<AtsIssue["severity"], string> = {
  critical: "border-danger/40 bg-danger-soft text-danger",
  warning: "border-warn/40 bg-warn-soft text-warn",
  info: "border-line bg-paper text-muted",
};

const RATING_STYLES: Record<AtsReport["rating"], string> = {
  Excellent: "border-accent/40 bg-accent-soft text-accent-strong",
  Good: "border-accent/30 bg-accent-soft text-accent-strong",
  Fair: "border-warn/40 bg-warn-soft text-warn",
  Poor: "border-danger/40 bg-danger-soft text-danger",
  "Needs Improvement": "border-danger/40 bg-danger-soft text-danger",
};

function barStyle(percent: number): React.CSSProperties {
  return { width: `${percent}%` };
}

function CheckRow({ check }: { check: AtsCheck }) {
  const percent = Math.round((check.score / check.maxScore) * 100);
  return (
    <li className="flex flex-col gap-1.5 rounded-md border border-line bg-paper p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{check.name}</span>
        <span className="font-mono text-xs text-muted">
          {check.score}/{check.maxScore}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full ${
            percent >= 100 ? "bg-accent" : percent >= 60 ? "bg-warn" : "bg-danger"
          }`}
          style={barStyle(percent)}
        />
      </div>
      {check.issues.map((issue) => (
        <p
          key={`${issue.severity}-${issue.field ?? ""}-${issue.message}`}
          className="flex flex-wrap items-baseline gap-1.5 text-xs"
        >
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] uppercase ${SEVERITY_STYLES[issue.severity]}`}
          >
            {issue.severity}
          </span>
          <span className="text-ink/90">{issue.message}</span>
          {issue.field ? (
            <code className="font-mono text-[10px] text-muted">{issue.field}</code>
          ) : null}
        </p>
      ))}
    </li>
  );
}

export function AtsPanel() {
  const [state, checkAction, pending] = useActionState(runAtsCheckAction, initialState);
  const report = state.report;

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <form action={checkAction}>
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
          >
            {pending ? "Checking…" : "Run ATS check"}
          </button>
        </form>
        {state.error && state.message ? (
          <output className="text-xs text-danger">{state.message}</output>
        ) : null}
        <a
          href="/cv/resume.json"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-accent-strong hover:underline"
        >
          resume.json ↗
        </a>
      </div>

      {pending ? (
        <p className="text-xs text-muted">
          Scoring your exported data and extracting the text of the PDF you send…
        </p>
      ) : null}

      {!report && !state.error ? (
        <p className="text-xs text-muted">
          Scores contact, experience, education, skills, keywords and dates from your exported CV,
          plus what an ATS reads in your uploaded PDF. Nothing is stored — it recomputes each run.
        </p>
      ) : null}

      {report ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-3xl font-semibold">{report.score}</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${RATING_STYLES[report.rating]}`}
            >
              {report.rating}
            </span>
            <span className="text-xs text-muted">
              {report.recommendations.length} recommendation
              {report.recommendations.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="max-w-[72ch] text-sm text-ink/90">{report.summary}</p>
          <ul className="flex flex-col gap-2">
            {report.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
