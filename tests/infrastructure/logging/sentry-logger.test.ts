import { beforeEach, describe, expect, it, vi } from "vitest";

const loggerInfo = vi.fn();
const loggerWarn = vi.fn();
const loggerError = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  logger: { info: loggerInfo, warn: loggerWarn, error: loggerError },
}));

const { SentryLogger } = await import("@/infrastructure/logging/sentry-logger");

describe("SentryLogger", () => {
  beforeEach(() => {
    loggerInfo.mockReset();
    loggerWarn.mockReset();
    loggerError.mockReset();
  });

  it("forwards each level to Sentry.logger with the context", () => {
    const logger = new SentryLogger(true);

    logger.info("llm call", { provider: "ollama", durationMs: 5 });
    logger.warn("slow", { durationMs: 9000 });
    logger.error("llm call failed", { error: "boom" });

    expect(loggerInfo).toHaveBeenCalledWith("llm call", { provider: "ollama", durationMs: 5 });
    expect(loggerWarn).toHaveBeenCalledWith("slow", { durationMs: 9000 });
    expect(loggerError).toHaveBeenCalledWith("llm call failed", { error: "boom" });
  });

  it("emits nothing when disabled (no SENTRY_DSN → local dev/tests stay silent)", () => {
    const logger = new SentryLogger(false);

    logger.info("should not appear");
    logger.warn("should not appear");
    logger.error("should not appear");

    expect(loggerInfo).not.toHaveBeenCalled();
    expect(loggerWarn).not.toHaveBeenCalled();
    expect(loggerError).not.toHaveBeenCalled();
  });

  it("omits the context argument when none is given", () => {
    const logger = new SentryLogger(true);

    logger.info("bare message");

    expect(loggerInfo).toHaveBeenCalledWith("bare message", undefined);
  });
});
