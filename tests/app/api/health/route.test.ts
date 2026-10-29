import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
vi.mock("@/app/_lib/container", () => ({
  pool: { query: queryMock },
}));

const { GET } = await import("@/app/api/health/route");

describe("health route", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ok without touching the DB on the happy path", async () => {
    const response = await GET(new Request("http://localhost/api/health"));

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(typeof body.time).toBe("string");
    expect(body).not.toHaveProperty("database");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("probes the database with ?deep=1", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const response = await GET(new Request("http://localhost/api/health?deep=1"));

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.database).toBe("ok");
    expect(queryMock).toHaveBeenCalledWith("select 1");
  });

  it("returns 503 when the deep probe cannot reach the database", async () => {
    queryMock.mockRejectedValue(new Error("connection refused"));

    const response = await GET(new Request("http://localhost/api/health?deep=1"));

    expect(response.status).toBe(503);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.status).toBe("error");
    expect(body.database).toBe("unreachable");
  });
});
