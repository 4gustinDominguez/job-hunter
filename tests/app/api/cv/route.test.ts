import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
vi.mock("@/app/_lib/container", () => ({
  uploadedCvRepository: { get: getMock },
}));

const { GET } = await import("@/app/api/cv/route");

describe("cv route", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the PDF inline with a safe filename", async () => {
    getMock.mockResolvedValue({
      filename: 'my "weird" cv (final).pdf',
      content: Buffer.from("%PDF-1.7 fake"),
      size: 14,
      uploadedAt: new Date(),
    });

    const response = await GET(new Request("http://localhost/api/cv"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      'inline; filename="my_weird_cv_final_.pdf"',
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("%PDF-1.7 fake");
  });

  it("switches to attachment for ?download=1", async () => {
    getMock.mockResolvedValue({
      filename: "cv.pdf",
      content: Buffer.from("%PDF"),
      size: 4,
      uploadedAt: new Date(),
    });

    const response = await GET(new Request("http://localhost/api/cv?download=1"));

    expect(response.headers.get("content-disposition")).toContain("attachment");
  });

  it("returns 404 when no CV is on file", async () => {
    getMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/cv"));

    expect(response.status).toBe(404);
  });
});
