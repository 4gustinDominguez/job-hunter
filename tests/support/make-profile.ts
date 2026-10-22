import type { CandidateProfile } from "@/domain/candidate/candidate-profile";

let counter = 0;

export function makeProfile(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  counter += 1;
  return {
    id: `profile-${counter}`,
    name: "Alex Morgan",
    email: "alex@example.com",
    experience: [
      {
        id: `exp-${counter}`,
        company: "Nimbus SaaS",
        position: "Senior Full Stack Developer",
        startDate: new Date("2022-01-01"),
        description: "SaaS analytics platform",
        achievements: [],
        skills: ["TypeScript", "React"],
      },
    ],
    skills: [
      { id: `skill-ts-${counter}`, name: "TypeScript", category: "PROGRAMMING", level: "EXPERT" },
      { id: `skill-react-${counter}`, name: "React", category: "FRAMEWORK", level: "EXPERT" },
      { id: `skill-node-${counter}`, name: "Node.js", category: "PROGRAMMING", level: "ADVANCED" },
    ],
    projects: [],
    education: [],
    preferences: {
      desiredRoles: ["Full Stack Developer", "Frontend Developer"],
      desiredLocations: ["Madrid", "Remote"],
      remotePreference: "ANY",
      salaryExpectation: { minimum: 55000, currency: "EUR" },
      excludedCompanies: ["BadCorp"],
      employmentTypes: ["FULL_TIME"],
    },
    ...overrides,
  };
}
