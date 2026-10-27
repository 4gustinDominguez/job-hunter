import type { SalaryRange } from "@/domain/shared/salary";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

export function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString();
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
