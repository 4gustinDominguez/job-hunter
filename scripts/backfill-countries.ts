/* oxlint-disable no-await-in-loop -- update chunks run sequentially by contract */
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { jobContentKey } from "../src/domain/job/dedup";
import { parseJobLocation } from "../src/domain/shared/country";
import type { Location } from "../src/domain/shared/location";
import { pool } from "../src/infrastructure/db/client";
import { companies, jobs } from "../src/infrastructure/db/schema";

/**
 * One-off maintenance: fills location.country from the city/scope text (country
 * used to be null on every row) and recomputes jobs.content_key so dedupe keys
 * match the new mapper output. Idempotent — safe to re-run after every mapper
 * change. Run against local Docker, then against Neon with DATABASE_URL set.
 */
async function main(): Promise<void> {
  const db = drizzle({ client: pool });
  const rows = await db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id));

  const updates: { id: string; location: Location; contentKey: string }[] = [];
  let locationChanged = 0;
  let keyChanged = 0;

  for (const row of rows) {
    const current = row.job.location ?? undefined;
    const raw =
      [current?.city, current?.region, current?.country].filter(Boolean).join(", ") || undefined;
    const location = parseJobLocation(raw, current?.isRemote ?? false);
    const contentKey = jobContentKey({
      title: row.job.title,
      company: { id: row.company.id, name: row.company.name },
      location,
    });
    const locationDiffers =
      location.city !== current?.city ||
      location.region !== current?.region ||
      location.country !== current?.country;
    if (locationDiffers) locationChanged += 1;
    if (contentKey !== row.job.contentKey) keyChanged += 1;
    if (locationDiffers || contentKey !== row.job.contentKey) {
      updates.push({ id: row.job.id, location, contentKey });
    }
  }

  const CHUNK = 50;
  for (let index = 0; index < updates.length; index += CHUNK) {
    const chunk = updates.slice(index, index + CHUNK);
    await Promise.all(
      chunk.map((update) =>
        db
          .update(jobs)
          .set({ location: update.location, contentKey: update.contentKey })
          .where(eq(jobs.id, update.id)),
      ),
    );
  }

  console.log(
    `backfill: ${rows.length} rows scanned · ${locationChanged} locations enriched · ${keyChanged} content keys recomputed · ${updates.length} rows updated.`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
