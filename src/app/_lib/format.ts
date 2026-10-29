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
