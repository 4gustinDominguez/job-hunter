import { describe, expect, it } from "vitest";
import { isOlderThan, timeAgo } from "@/app/_lib/format";

const NOW = new Date("2026-10-27T12:00:00Z");

describe("timeAgo", () => {
  it("uses seconds, minutes, hours and days", () => {
    expect(timeAgo(new Date("2026-10-27T11:59:30Z"), NOW)).toBe("30s ago");
    expect(timeAgo(new Date("2026-10-27T11:30:00Z"), NOW)).toBe("30m ago");
    expect(timeAgo(new Date("2026-10-27T09:00:00Z"), NOW)).toBe("3h ago");
    expect(timeAgo(new Date("2026-10-24T12:00:00Z"), NOW)).toBe("3d ago");
  });

  it("never goes negative for future dates", () => {
    expect(timeAgo(new Date("2026-10-27T13:00:00Z"), NOW)).toBe("0s ago");
  });
});

describe("isOlderThan", () => {
  const THIRTY_SIX_HOURS = 36 * 60 * 60 * 1000;

  it("compares against a 36h staleness window", () => {
    expect(isOlderThan(new Date("2026-10-27T11:00:00Z"), THIRTY_SIX_HOURS, NOW)).toBe(false);
    expect(isOlderThan(new Date("2026-10-25T12:00:00Z"), THIRTY_SIX_HOURS, NOW)).toBe(true);
  });
});
