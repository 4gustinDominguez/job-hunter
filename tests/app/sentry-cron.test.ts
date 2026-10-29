import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureCheckInMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureCheckIn: captureCheckInMock,
}));

const { beginCronCheckIn, finishCronCheckIn, CRON_MONITOR_SLUG } =
  await import("@/app/_lib/sentry-cron");

describe("sentry-cron check-ins", () => {
  beforeEach(() => {
    captureCheckInMock.mockReset().mockReturnValue("generated-check-in-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("beginCronCheckIn", () => {
    it("no-ops (returns null) when SENTRY_DSN is unset", () => {
      vi.stubEnv("SENTRY_DSN", "");

      expect(beginCronCheckIn()).toBeNull();
      expect(captureCheckInMock).not.toHaveBeenCalled();
    });

    it("sends an in_progress check-in with the cron schedule when DSN is set", () => {
      vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");

      const id = beginCronCheckIn();

      expect(id).toBe("generated-check-in-id");
      expect(captureCheckInMock).toHaveBeenCalledTimes(1);
      const [checkIn, monitorConfig] = captureCheckInMock.mock.calls[0] as [
        Record<string, unknown>,
        Record<string, unknown>,
      ];
      expect(checkIn.monitorSlug).toBe(CRON_MONITOR_SLUG);
      expect(checkIn.status).toBe("in_progress");
      expect(monitorConfig.schedule).toEqual({ type: "crontab", value: "0 9 * * *" });
      expect(monitorConfig.timezone).toBe("UTC");
    });
  });

  describe("finishCronCheckIn", () => {
    it("is a no-op when the id is null", () => {
      vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");

      finishCronCheckIn(null, true, 1000);

      expect(captureCheckInMock).not.toHaveBeenCalled();
    });

    it("sends an ok check-in with duration in seconds", () => {
      vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");

      finishCronCheckIn("abc", true, 4200);

      const [checkIn] = captureCheckInMock.mock.calls[0] as [Record<string, unknown>];
      expect(checkIn.monitorSlug).toBe(CRON_MONITOR_SLUG);
      expect(checkIn.status).toBe("ok");
      expect(checkIn.checkInId).toBe("abc");
      expect(checkIn.duration).toBe(4);
    });

    it("sends an error check-in when ok=false", () => {
      vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");

      finishCronCheckIn("abc", false, 1000);

      const [checkIn] = captureCheckInMock.mock.calls[0] as [Record<string, unknown>];
      expect(checkIn.status).toBe("error");
    });
  });
});
