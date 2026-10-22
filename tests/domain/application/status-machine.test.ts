import { describe, expect, it } from "vitest";
import {
  canTransition,
  allowedTransitions,
  APPLICATION_STATUS_TRANSITIONS,
} from "@/domain/application/status-machine";
import { APPLICATION_STATUSES } from "@/domain/application/enums";

describe("canTransition", () => {
  it("allows the happy path forward", () => {
    expect(canTransition("DISCOVERED", "INTERESTED")).toBe(true);
    expect(canTransition("INTERESTED", "ANALYZED")).toBe(true);
    expect(canTransition("ANALYZED", "APPLICATION_READY")).toBe(true);
    expect(canTransition("APPLICATION_READY", "APPLIED")).toBe(true);
    expect(canTransition("APPLIED", "FOLLOW_UP")).toBe(true);
    expect(canTransition("FOLLOW_UP", "INTERVIEW")).toBe(true);
    expect(canTransition("INTERVIEW", "OFFER")).toBe(true);
  });

  it("allows back-edits for non-submitted applications", () => {
    expect(canTransition("ANALYZED", "INTERESTED")).toBe(true);
    expect(canTransition("APPLICATION_READY", "ANALYZED")).toBe(true);
  });

  it("allows skipping to outcomes from active statuses", () => {
    expect(canTransition("APPLIED", "REJECTED")).toBe(true);
    expect(canTransition("APPLIED", "OFFER")).toBe(true);
    expect(canTransition("INTERVIEW", "REJECTED")).toBe(true);
    expect(canTransition("OFFER", "WITHDRAWN")).toBe(true);
  });

  it("allows withdrawing from any non-terminal status", () => {
    for (const status of APPLICATION_STATUSES) {
      if (status === "REJECTED" || status === "WITHDRAWN") {
        continue;
      }
      expect(canTransition(status, "WITHDRAWN")).toBe(true);
    }
  });

  it("rejects skipping the workflow", () => {
    expect(canTransition("DISCOVERED", "APPLIED")).toBe(false);
    expect(canTransition("DISCOVERED", "ANALYZED")).toBe(false);
    expect(canTransition("INTERESTED", "APPLICATION_READY")).toBe(false);
    expect(canTransition("ANALYZED", "APPLIED")).toBe(false);
  });

  it("treats REJECTED and WITHDRAWN as terminal", () => {
    for (const target of APPLICATION_STATUSES) {
      expect(canTransition("REJECTED", target)).toBe(false);
      expect(canTransition("WITHDRAWN", target)).toBe(false);
    }
  });

  it("rejects invalid backward moves", () => {
    expect(canTransition("APPLIED", "APPLICATION_READY")).toBe(false);
    expect(canTransition("INTERVIEW", "APPLIED")).toBe(false);
    expect(canTransition("OFFER", "INTERVIEW")).toBe(false);
    expect(canTransition("OFFER", "REJECTED")).toBe(false);
  });
});

describe("allowedTransitions", () => {
  it("returns an empty list for terminal statuses", () => {
    expect(allowedTransitions("REJECTED")).toEqual([]);
    expect(allowedTransitions("WITHDRAWN")).toEqual([]);
  });

  it("defines transitions for every status", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(APPLICATION_STATUS_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(allowedTransitions(status))).toBe(true);
    }
  });

  it("only returns valid statuses", () => {
    for (const status of APPLICATION_STATUSES) {
      for (const target of allowedTransitions(status)) {
        expect(APPLICATION_STATUSES).toContain(target);
      }
    }
  });
});
