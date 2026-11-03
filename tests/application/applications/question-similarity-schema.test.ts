import { describe, expect, it } from "vitest";
import { parseSimilarity } from "@/application/applications/question-similarity-schema";

describe("questionSimilaritySchema", () => {
  it("parses a valid match list", () => {
    const matches = parseSimilarity({
      matches: [
        { questionId: "q-1", reason: "Same topic." },
        { questionId: "q-2", reason: "Transferable experience." },
      ],
    });

    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({ questionId: "q-1", reason: "Same topic." });
  });

  it("defaults to an empty list when matches is missing", () => {
    expect(parseSimilarity({})).toEqual([]);
  });

  it("rejects matches without an id", () => {
    expect(() => parseSimilarity({ matches: [{ reason: "no id" }] })).toThrow();
  });

  it("rejects matches without a reason", () => {
    expect(() => parseSimilarity({ matches: [{ questionId: "q-1" }] })).toThrow();
  });

  it("rejects a non-object payload", () => {
    expect(() => parseSimilarity("not json")).toThrow();
  });
});
