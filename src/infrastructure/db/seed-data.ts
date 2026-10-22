import { candidateProfiles, profileSkills, searchProfiles } from "./schema";

export const SEED_PROFILE: typeof candidateProfiles.$inferInsert = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  phone: "+34 600 123 456",
  location: { city: "Madrid", country: "Spain", isRemote: false },
  summary:
    "Full stack developer with 6 years of experience building SaaS products with TypeScript, React and Node.js. Comfortable owning features end to end, from discovery to production.",
  experience: [
    {
      id: "exp-1",
      company: "Nimbus SaaS",
      position: "Senior Full Stack Developer",
      startDate: new Date("2022-03-01"),
      endDate: undefined,
      description: "Core product team for a billing automation platform.",
      achievements: [
        "Cut invoice processing time by 40% with an event driven rewrite",
        "Led migration from REST to tRPC across 3 services",
        "Mentored two junior developers",
      ],
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    },
    {
      id: "exp-2",
      company: "Digital Grove",
      position: "Frontend Developer",
      startDate: new Date("2019-09-01"),
      endDate: new Date("2022-02-28"),
      description: "Agency work across e-commerce and fintech clients.",
      achievements: [
        "Built a reusable component library used in 8 client projects",
        "Improved Lighthouse performance scores from 62 to 94",
      ],
      skills: ["React", "TypeScript", "CSS"],
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "Traillog",
      description: "Open source trip planning PWA with offline support.",
      url: "https://github.com/example/traillog",
      technologies: ["React", "TypeScript", "IndexedDB"],
      highlights: ["1.2k GitHub stars", "Featured in a newsletter"],
    },
    {
      id: "proj-2",
      name: "Invoice Parser CLI",
      description: "CLI that extracts line items from PDF invoices.",
      technologies: ["Node.js", "PostgreSQL"],
      highlights: ["Used internally by two companies"],
    },
  ],
  education: [
    {
      id: "edu-1",
      institution: "Universidad Politécnica de Madrid",
      degree: "Bachelor",
      field: "Computer Science",
      startDate: new Date("2015-09-01"),
      endDate: new Date("2019-06-15"),
      achievements: ["Final project awarded honours"],
    },
  ],
  preferences: {
    desiredRoles: ["Full Stack Developer", "Frontend Developer"],
    desiredLocations: ["Madrid", "Barcelona", "Remote"],
    remotePreference: "HYBRID",
    salaryExpectation: { minimum: 55000, currency: "EUR" },
    excludedCompanies: [],
    employmentTypes: ["FULL_TIME", "CONTRACT"],
  },
};

export const SEED_SKILLS: Array<Omit<typeof profileSkills.$inferInsert, "profileId" | "lastUsed">> =
  [
    {
      name: "TypeScript",
      category: "PROGRAMMING",
      level: "EXPERT",
      yearsOfExperience: 6,
      position: 0,
    },
    { name: "React", category: "FRAMEWORK", level: "EXPERT", yearsOfExperience: 5, position: 1 },
    {
      name: "Node.js",
      category: "PROGRAMMING",
      level: "ADVANCED",
      yearsOfExperience: 5,
      position: 2,
    },
    {
      name: "PostgreSQL",
      category: "TOOL",
      level: "ADVANCED",
      yearsOfExperience: 4,
      position: 3,
    },
    {
      name: "English",
      category: "LANGUAGE",
      level: "ADVANCED",
      yearsOfExperience: 10,
      position: 4,
    },
  ];

export const SEED_SEARCH_PROFILES: Array<typeof searchProfiles.$inferInsert> = [
  {
    name: "Full Stack Madrid",
    keywords: ["typescript", "react", "node.js"],
    locations: ["Madrid", "Barcelona"],
    remotePreference: "HYBRID",
    employmentTypes: ["FULL_TIME"],
    seniority: ["MID", "SENIOR"],
    salaryMin: 45000,
    salaryCurrency: "EUR",
    excludedCompanies: [],
    excludedKeywords: ["php", "wordpress"],
  },
  {
    name: "Remote Europe",
    keywords: ["react", "frontend", "typescript"],
    locations: ["Remote"],
    remotePreference: "REMOTE",
    employmentTypes: ["FULL_TIME", "CONTRACT"],
    seniority: ["SENIOR", "LEAD"],
    salaryMin: 50000,
    salaryCurrency: "EUR",
    excludedCompanies: ["Some Corp"],
    excludedKeywords: [],
  },
];
