import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAuthenticated, isPublicPath } from "@/proxy";
import { createSessionToken } from "@/app/_lib/auth";

const SECRET = "test-secret-at-least-32-characters-long!!";

describe("proxy: isPublicPath", () => {
  it("exposes /login and /api/cron (and their children), everything else needs auth", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/cron/fetch-jobs")).toBe(true);

    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/jobs")).toBe(false);
    expect(isPublicPath("/api/cv")).toBe(false);
    expect(isPublicPath("/login-adjacent")).toBe(false);
    expect(isPublicPath("/apix")).toBe(false);
  });
});

describe("proxy: isAuthenticated", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a valid session token", async () => {
    const { token } = await createSessionToken();

    expect(await isAuthenticated(token)).toBe(true);
  });

  it("rejects garbage, empty and missing tokens", async () => {
    expect(await isAuthenticated("not.a.jwt")).toBe(false);
    expect(await isAuthenticated("")).toBe(false);
    expect(await isAuthenticated(undefined)).toBe(false);
  });

  it("fails closed when AUTH_SECRET is missing", async () => {
    const { token } = await createSessionToken();

    vi.stubEnv("AUTH_SECRET", "");

    expect(await isAuthenticated(token)).toBe(false);
  });
});
