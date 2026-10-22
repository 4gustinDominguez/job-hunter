/* oxlint-disable no-await-in-loop */
import { and, eq, sql } from "drizzle-orm";
import type { Company } from "@/domain/company/company";
import {
  canonicalizeUrl,
  DEFAULT_DESCRIPTION_SIMILARITY_THRESHOLD,
  jobContentKey,
  jaccardSimilarity,
} from "@/domain/job/dedup";
import type { Job } from "@/domain/job/job";
import { normalizeText } from "@/domain/shared/text";
import { FIXTURE_JOBS } from "@/infrastructure/job-sources/fixture/fixture-jobs";
import { db, pool } from "./client";
import {
  applications,
  candidateProfiles,
  companies,
  contacts,
  jobListings,
  jobs,
  profileSkills,
  searchProfiles,
} from "./schema";
import { SEED_PROFILE, SEED_SEARCH_PROFILES, SEED_SKILLS } from "./seed-data";

async function upsertCompany(company: Company): Promise<string> {
  const normalizedName = normalizeText(company.name);
  const [row] = await db
    .insert(companies)
    .values({
      name: company.name,
      normalizedName,
      url: company.url ?? null,
      description: company.description ?? null,
      industry: company.industry ?? null,
      size: company.size ?? null,
      location: company.location ?? null,
    })
    .onConflictDoUpdate({
      target: companies.normalizedName,
      set: { name: company.name, updatedAt: new Date() },
    })
    .returning({ id: companies.id });
  return row.id;
}

async function isDuplicateListing(
  url: string,
  source: Job["source"],
  externalId?: string,
): Promise<boolean> {
  const canonicalUrl = canonicalizeUrl(url);
  const byUrl = await db
    .select({ id: jobListings.id })
    .from(jobListings)
    .where(eq(jobListings.canonicalUrl, canonicalUrl))
    .limit(1);
  if (byUrl.length > 0) return true;
  if (externalId !== undefined) {
    const byExternal = await db
      .select({ id: jobListings.id })
      .from(jobListings)
      .where(and(eq(jobListings.source, source), eq(jobListings.externalId, externalId)))
      .limit(1);
    if (byExternal.length > 0) return true;
  }
  return false;
}

async function findCanonicalJob(job: Job): Promise<{ id: string } | undefined> {
  const contentKey = jobContentKey(job);
  const candidates = await db.select().from(jobs).where(eq(jobs.contentKey, contentKey));
  return candidates.find(
    (candidate) =>
      candidate.description === "" ||
      job.description === "" ||
      jaccardSimilarity(candidate.description, job.description) >=
        DEFAULT_DESCRIPTION_SIMILARITY_THRESHOLD,
  );
}

async function insertListing(jobId: string, job: Job): Promise<void> {
  await db.insert(jobListings).values({
    jobId,
    source: job.source,
    externalId: job.externalId ?? null,
    url: job.url,
    canonicalUrl: canonicalizeUrl(job.url),
    publishedAt: job.publishedAt ?? null,
    discoveredAt: job.discoveredAt,
  });
}

async function ingestJobs(fixtures: Job[]): Promise<Map<string, string>> {
  const persistedByFixtureId = new Map<string, string>();
  for (const fixture of fixtures) {
    if (await isDuplicateListing(fixture.url, fixture.source, fixture.externalId)) {
      continue;
    }
    const canonical = await findCanonicalJob(fixture);
    if (canonical) {
      await insertListing(canonical.id, fixture);
      persistedByFixtureId.set(fixture.id, canonical.id);
      continue;
    }
    const companyId = await upsertCompany(fixture.company);
    const [inserted] = await db
      .insert(jobs)
      .values({
        title: fixture.title,
        description: fixture.description,
        companyId,
        location: fixture.location ?? null,
        remoteType: fixture.remoteType ?? null,
        salary: fixture.salary ?? null,
        employmentType: fixture.employmentType ?? null,
        skills: fixture.skills ?? null,
        contentKey: jobContentKey(fixture),
      })
      .returning({ id: jobs.id });
    await insertListing(inserted.id, fixture);
    persistedByFixtureId.set(fixture.id, inserted.id);
  }
  return persistedByFixtureId;
}

async function seed(): Promise<void> {
  await db.execute(sql`
    truncate table applications, contacts, job_listings, jobs,
      profile_skills, candidate_profiles, search_profiles, companies
    restart identity cascade
  `);

  const [profile] = await db
    .insert(candidateProfiles)
    .values(SEED_PROFILE)
    .returning({ id: candidateProfiles.id });
  for (const skill of SEED_SKILLS) {
    await db.insert(profileSkills).values({ ...skill, profileId: profile.id, lastUsed: null });
  }

  await db.insert(searchProfiles).values(SEED_SEARCH_PROFILES);

  const jobIds = await ingestJobs(FIXTURE_JOBS);

  const fullStackId = jobIds.get("fixture-job-03");
  const frontendId = jobIds.get("fixture-job-05");
  if (!fullStackId || !frontendId) {
    throw new Error("Seed fixtures missing expected jobs");
  }

  const [contact] = await db
    .insert(contacts)
    .values({
      name: "Marta Ruiz",
      email: "marta.ruiz@helios.example",
      role: "Engineering Manager",
      company: "Helios Digital",
      linkedin: "https://linkedin.example/in/martaruiz",
      notes: ["Met at TechJam Madrid"],
    })
    .returning({ id: contacts.id });

  await db.insert(applications).values([
    {
      jobId: fullStackId,
      status: "APPLIED",
      appliedAt: new Date(),
      cvVersion: "cv-2026-10",
      notes: ["Applied through the company website"],
      nextActionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      jobId: frontendId,
      status: "INTERVIEW",
      appliedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      cvVersion: "cv-2026-10",
      coverLetterVersion: "cl-2026-10",
      contactId: contact.id,
      notes: ["Technical interview scheduled for next week"],
      nextActionAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
  ]);

  const listingCount = await db.select({ count: sql<number>`count(*)` }).from(jobListings);
  const jobCount = await db.select({ count: sql<number>`count(*)` }).from(jobs);
  console.log(
    `Seed complete: 1 profile, ${SEED_SKILLS.length} skills, ${SEED_SEARCH_PROFILES.length} search profiles, ` +
      `${jobCount[0].count} jobs from ${listingCount[0].count} listings, 2 applications.`,
  );
}

async function main(): Promise<void> {
  try {
    await seed();
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
