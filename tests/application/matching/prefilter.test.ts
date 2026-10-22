import { describe, expect, it } from "vitest";
import { prefilterJob } from "@/application/matching/prefilter";
import { makeJob } from "../../support/make-job";
import { makeProfile } from "../../support/make-profile";

describe("prefilterJob", () => {
  const profile = makeProfile();

  it("passes when a profile skill appears in the description", () => {
    const job = makeJob({
      title: "Platform Engineer",
      company: { id: "c1", name: "K8s Shop" },
      description: "Operate clusters with Go. Our product API is written in TypeScript.",
      skills: ["Kubernetes", "Go"],
    });

    expect(prefilterJob(job, profile).pass).toBe(true);
  });

  it("passes when a desired role is mentioned in the title", () => {
    const job = makeJob({
      title: "Frontend Developer",
      company: { id: "c2", name: "Other Co" },
      description: "Vue and CSS dashboards.",
      skills: ["Vue"],
    });

    expect(prefilterJob(job, profile).pass).toBe(true);
  });

  it("skips when there is no desired-role or skill overlap", () => {
    const job = makeJob({
      title: "Embedded C Engineer",
      company: { id: "c3", name: "Firmware Inc" },
      description: "Bare-metal C, RTOS, soldering irons.",
      skills: ["C", "RTOS"],
    });

    const decision = prefilterJob(job, profile);
    expect(decision.pass).toBe(false);
    expect(decision.reason).toContain("no desired-role or skill overlap");
  });

  it("skips excluded companies before anything else", () => {
    const job = makeJob({
      title: "Full Stack Developer",
      company: { id: "c4", name: "badcorp" },
      description: "TypeScript React role at BadCorp.",
    });

    const decision = prefilterJob(job, profile);
    expect(decision.pass).toBe(false);
    expect(decision.reason).toBe("excluded company");
  });

  it("skips on-site jobs when the profile requires remote", () => {
    const remoteProfile = makeProfile({
      preferences: { ...profile.preferences, remotePreference: "REMOTE" },
    });
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role in the office.",
      remoteType: "ONSITE",
    });

    const decision = prefilterJob(job, remoteProfile);
    expect(decision.pass).toBe(false);
    expect(decision.reason).toContain("remote");
  });

  it("skips when the job salary maximum is below the profile minimum", () => {
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role.",
      salary: { minimum: 30000, maximum: 40000, currency: "EUR", period: "yearly" },
    });

    const decision = prefilterJob(job, profile);
    expect(decision.pass).toBe(false);
    expect(decision.reason).toBe("salary range below expectation");
  });

  it("passes when salary data is missing (bias toward PASS)", () => {
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role without salary.",
      salary: undefined,
    });

    expect(prefilterJob(job, profile).pass).toBe(true);
  });

  it("passes borderline location mismatches (bias toward PASS)", () => {
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role.",
      location: { city: "Sevilla", country: "Spain", isRemote: false },
      remoteType: "ONSITE",
    });

    expect(prefilterJob(job, profile).pass).toBe(true);
  });
});
