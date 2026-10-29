import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  init: initMock,
}));

const { createSentryOptions } = await import("@/sentry.server.config");

describe("sentry.server.config createSentryOptions", () => {
  beforeEach(() => {
    initMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled and drops every PII-bearing collector by default", () => {
    vi.stubEnv("SENTRY_DSN", "");

    const options = createSentryOptions();

    expect(options.enabled).toBe(false);
    expect(options.dsn).toBe("");
    // Error events only — no performance spans.
    expect(options.tracesSampleRate).toBe(0);
    // The no-PII invariant: every category that could carry candidate or user
    // data is switched off.
    expect(options.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    });
  });

  it("enables only when a DSN is present", () => {
    vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");

    expect(createSentryOptions().enabled).toBe(true);
  });

  it("strips query strings and request metadata in beforeSend", () => {
    vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");

    const beforeSend = createSentryOptions().beforeSend!;
    const event = {
      request: {
        url: "http://localhost/api/cv?download=1&secret=xyz",
        data: "payload",
        headers: { cookie: "session=abc" },
        cookies: { session: "abc" },
      },
    } as unknown as Parameters<typeof beforeSend>[0];

    const result = beforeSend(event, {}) as typeof event;

    expect(result.request?.url).toBe("http://localhost/api/cv");
    expect(result.request?.data).toBeUndefined();
    expect(result.request?.headers).toBeUndefined();
    expect(result.request?.cookies).toBeUndefined();
  });

  it("returns the event unchanged when there is no request", () => {
    vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");

    const beforeSend = createSentryOptions().beforeSend!;
    const event = { message: "plain error" } as unknown as Parameters<typeof beforeSend>[0];

    expect(beforeSend(event, {})).toBe(event);
  });
});
