import type { SalaryRange } from "@/domain/shared/salary";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

const monthYearFormat = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });

/** "Mar 2022 – Present" / "Sep 2015 – Jun 2019" — CV-style month-year range. */
export function formatDateRange(startDate: Date, endDate?: Date): string {
  const start = monthYearFormat.format(startDate);
  const end = endDate ? monthYearFormat.format(endDate) : "Present";
  return `${start} – ${end}`;
}

export function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString();
}

/** True when `date` is older than `withinMs` from now — for cron-health staleness. */
export function isStale(date: Date, withinMs: number): boolean {
  return new Date().getTime() - date.getTime() > withinMs;
}

/** "2h ago", "3d ago" — for the dashboard's cron-health line. */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86400],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units.toReversed()) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds / 60), "minute");
}

export function formatSalary(salary: SalaryRange): string {
  const parts: string[] = [];
  if (salary.minimum !== undefined) parts.push(String(salary.minimum));
  if (salary.maximum !== undefined) parts.push(String(salary.maximum));
  const period = salary.period === "yearly" ? "/yr" : salary.period === "monthly" ? "/mo" : "/hr";
  return `${parts.join("–")} ${salary.currency} ${period}`;
}

export function formatLocation(location?: {
  city?: string;
  region?: string;
  country?: string;
  isRemote: boolean;
}): string {
  if (!location) return "—";
  const place = [location.city, location.region, location.country].filter(Boolean).join(", ");
  if (!place) return location.isRemote ? "Remote" : "—";
  return place;
}

/** Compact relative time for the dashboard's "last run" line ("2h ago"). */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** True when `date` is older than `ms` relative to now (staleness checks). */
export function isOlderThan(date: Date, ms: number, now: Date = new Date()): boolean {
  return now.getTime() - date.getTime() > ms;
}

/** Midnight of the current local day (counters need a stable boundary). */
export function startOfToday(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}
