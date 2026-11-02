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

  it("skips fake remote bound to the US when the profile requires remote", () => {
    const remoteProfile = makeProfile({
      preferences: { ...profile.preferences, remotePreference: "REMOTE" },
    });
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role.",
      remoteType: "REMOTE",
      location: { country: "United States", isRemote: true },
    });

    const decision = prefilterJob(job, remoteProfile);
    expect(decision.pass).toBe(false);
    expect(decision.reason).toBe("remote restricted to United States");
  });

  it("skips fake remote bound to Canada when the profile requires remote", () => {
    const remoteProfile = makeProfile({
      preferences: { ...profile.preferences, remotePreference: "REMOTE" },
    });
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role.",
      remoteType: "REMOTE",
      location: { country: "Canada", isRemote: true },
    });

    const decision = prefilterJob(job, remoteProfile);
    expect(decision.pass).toBe(false);
    expect(decision.reason).toBe("remote restricted to Canada");
  });

  it("passes remote scoped to a non-North-American country (e.g. Germany)", () => {
    const remoteProfile = makeProfile({
      preferences: { ...profile.preferences, remotePreference: "REMOTE" },
    });
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role.",
      remoteType: "REMOTE",
      location: { country: "Germany", isRemote: true },
    });

    expect(prefilterJob(job, remoteProfile).pass).toBe(true);
  });

  it("passes a North-America-only region scope as fake remote (USA, Canada…)", () => {
    const remoteProfile = makeProfile({
      preferences: { ...profile.preferences, remotePreference: "REMOTE" },
    });
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role.",
      remoteType: "REMOTE",
      location: { region: "USA, Canada, USA timezones", isRemote: true },
    });

    const decision = prefilterJob(job, remoteProfile);
    expect(decision.pass).toBe(false);
    expect(decision.reason).toBe("remote restricted to North America");
  });

  it("passes a multi-region scope that includes North America (not fake remote)", () => {
    const remoteProfile = makeProfile({
      preferences: { ...profile.preferences, remotePreference: "REMOTE" },
    });
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role.",
      remoteType: "REMOTE",
      location: { region: "Europe, USA, Canada, Australia", isRemote: true },
    });

    expect(prefilterJob(job, remoteProfile).pass).toBe(true);
  });

  it("detects a US-only constraint hidden in the description when the field says worldwide", () => {
    const remoteProfile = makeProfile({
      preferences: { ...profile.preferences, remotePreference: "REMOTE" },
    });
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role. Candidates must be based in the US.",
      remoteType: "REMOTE",
      location: { isRemote: true },
    });

    const decision = prefilterJob(job, remoteProfile);
    expect(decision.pass).toBe(false);
    expect(decision.reason).toBe("remote restricted to United States");
  });

  it("does not flag remote jobs when the profile does not require remote", () => {
    // Default profile is remotePreference: "ANY" — a US-scoped remote passes.
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role.",
      remoteType: "REMOTE",
      location: { country: "United States", isRemote: true },
    });

    expect(prefilterJob(job, profile).pass).toBe(true);
  });

  it("skips hybrid jobs when the profile requires full remote", () => {
    const remoteProfile = makeProfile({
      preferences: { ...profile.preferences, remotePreference: "REMOTE" },
    });
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role.",
      remoteType: "HYBRID",
    });

    const decision = prefilterJob(job, remoteProfile);
    expect(decision.pass).toBe(false);
    expect(decision.reason).toContain("hybrid");
  });

  it("passes worldwide remote when the profile requires full remote", () => {
    const remoteProfile = makeProfile({
      preferences: { ...profile.preferences, remotePreference: "REMOTE" },
    });
    const job = makeJob({
      title: "Full Stack Developer",
      description: "TypeScript React role.",
      remoteType: "REMOTE",
      location: { isRemote: true },
    });

    expect(prefilterJob(job, remoteProfile).pass).toBe(true);
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
