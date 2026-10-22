import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/app/_lib/password";

const setCookieMock = vi.fn();
const deleteCookieMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const client = vi.hoisted(() => ({ ip: "203.0.113.7" }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: setCookieMock,
    delete: deleteCookieMock,
    get: () => undefined,
    getAll: () => [],
    has: () => false,
    clear: vi.fn(),
  }),
  headers: async () => new Headers({ "x-forwarded-for": client.ip }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const { loginAction } = await import("@/app/login/actions");

function form(username: string, password: string): FormData {
  const data = new FormData();
  data.set("username", username);
  data.set("password", password);
  return data;
}

describe("loginAction", () => {
  beforeEach(() => {
    setCookieMock.mockClear();
    deleteCookieMock.mockClear();
    redirectMock.mockClear();
    client.ip = "203.0.113.7";
    vi.stubEnv("AUTH_USERNAME", "agustin");
    vi.stubEnv("AUTH_PASSWORD_HASH", hashPassword("hunter2"));
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-characters-long!!");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs in with correct credentials: sets the cookie and redirects home", async () => {
    await expect(loginAction({}, form("agustin", "hunter2"))).rejects.toThrow("NEXT_REDIRECT:/");

    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(setCookieMock).toHaveBeenCalledTimes(1);
    const [name, token, options] = setCookieMock.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe("session");
    expect(token.split(".")).toHaveLength(3);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("rejects a wrong password with a generic error and no cookie", async () => {
    const state = await loginAction({}, form("agustin", "wrong"));

    expect(state.error).toBe("Invalid username or password.");
    expect(setCookieMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown username with the same generic message", async () => {
    const state = await loginAction({}, form("nobody", "hunter2"));

    expect(state.error).toBe("Invalid username or password.");
    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it("blocks after repeated failures (attempt limiter)", async () => {
    client.ip = "198.51.100.9";
    for (let attempt = 0; attempt < 10; attempt++) {
      // oxlint-disable-next-line no-await-in-loop -- limiter counter must increment in order
      await loginAction({}, form("agustin", "wrong"));
    }

    const state = await loginAction({}, form("agustin", "hunter2"));

    expect(state.error).toContain("Too many attempts");
    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it("returns a configuration error when AUTH env is missing", async () => {
    vi.stubEnv("AUTH_PASSWORD_HASH", "");

    const state = await loginAction({}, form("agustin", "hunter2"));

    expect(state.error).toContain("not configured");
    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it("validates empty inputs", async () => {
    const state = await loginAction({}, form("", ""));

    expect(state.error).toContain("username and password");
  });
});
