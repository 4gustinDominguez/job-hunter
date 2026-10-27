import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("responds ok with a version and a timestamp (no DB)", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; version: string; time: string };
    expect(body.status).toBe("ok");
    expect(body.version).toBeTruthy();
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });
});
