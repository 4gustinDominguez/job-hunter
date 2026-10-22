import { describe, expect, it } from "vitest";
import { AttemptLimiter, hashPassword, verifyPassword } from "@/app/_lib/password";

describe("password hashing", () => {
  it("round-trips a password", () => {
    const hash = hashPassword("correct horse battery staple");

    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces unique salts per hash", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("returns false for malformed hashes instead of throwing", () => {
    expect(verifyPassword("x", "not-a-hash")).toBe(false);
    expect(verifyPassword("x", "aa:zz")).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
  });
});

describe("AttemptLimiter", () => {
  it("blocks after the max attempts inside the window", () => {
    const limiter = new AttemptLimiter(3, 60_000);
    const now = 1_000_000;

    expect(limiter.isBlocked("ip", now)).toBe(false);
    limiter.fail("ip", now);
    limiter.fail("ip", now);
    expect(limiter.isBlocked("ip", now)).toBe(false);
    limiter.fail("ip", now);
    expect(limiter.isBlocked("ip", now)).toBe(true);
  });

  it("resets the window once it expires", () => {
    const limiter = new AttemptLimiter(2, 60_000);
    limiter.fail("ip", 1_000);
    limiter.fail("ip", 1_000);

    expect(limiter.isBlocked("ip", 1_000)).toBe(true);
    expect(limiter.isBlocked("ip", 61_001)).toBe(false);
  });

  it("clears on success (reset)", () => {
    const limiter = new AttemptLimiter(2, 60_000);
    limiter.fail("ip", 1_000);
    limiter.fail("ip", 1_000);
    expect(limiter.isBlocked("ip", 1_000)).toBe(true);

    limiter.reset("ip");
    expect(limiter.isBlocked("ip", 1_000)).toBe(false);
  });

  it("tracks keys independently", () => {
    const limiter = new AttemptLimiter(1, 60_000);
    limiter.fail("a", 1_000);

    expect(limiter.isBlocked("a", 1_000)).toBe(true);
    expect(limiter.isBlocked("b", 1_000)).toBe(false);
  });
});
