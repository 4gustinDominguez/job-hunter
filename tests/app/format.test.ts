import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/app/_lib/format";

const NOW = new Date("2026-10-29T12:00:00Z");

describe("formatRelativeTime", () => {
  it("returns 'just now' under a minute", () => {
    expect(formatRelativeTime(new Date("2026-10-29T11:59:40Z"), NOW)).toBe("just now");
  });

  it("formats minutes, hours and days", () => {
    expect(formatRelativeTime(new Date("2026-10-29T11:30:00Z"), NOW)).toBe("30 minutes ago");
    expect(formatRelativeTime(new Date("2026-10-29T09:00:00Z"), NOW)).toBe("3 hours ago");
    expect(formatRelativeTime(new Date("2026-10-27T12:00:00Z"), NOW)).toBe("2 days ago");
  });

  it("formats future times as 'in …'", () => {
    expect(formatRelativeTime(new Date("2026-10-29T15:00:00Z"), NOW)).toBe("in 3 hours");
  });
});
