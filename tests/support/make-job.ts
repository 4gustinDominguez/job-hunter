import type { Job } from "@/domain/job/job";

let counter = 0;

export function makeJob(overrides: Partial<Job> = {}): Job {
  counter += 1;
  return {
    id: `job-${counter}`,
    source: "FIXTURE",
    externalId: `ext-${counter}`,
    url: `https://jobs.example/job-${counter}`,
    title: "Senior Full Stack Developer",
    company: { id: `company-${counter}`, name: "Acme Software" },
    location: { city: "Madrid", country: "Spain", isRemote: false },
    remoteType: "ONSITE",
    description:
      "We are building a SaaS analytics product with TypeScript, React and Node.js. You will own features end to end.",
    employmentType: "FULL_TIME",
    publishedAt: new Date("2026-10-01T09:00:00Z"),
    discoveredAt: new Date("2026-10-01T10:00:00Z"),
    skills: ["TypeScript", "React"],
    ...overrides,
  };
}
