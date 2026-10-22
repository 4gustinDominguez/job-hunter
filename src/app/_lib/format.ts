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
