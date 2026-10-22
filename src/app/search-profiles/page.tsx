import type { Metadata } from "next";
import Link from "next/link";
import { deleteSearchProfileAction } from "../_lib/actions";
import { searchProfileRepository } from "../_lib/container";

export const metadata: Metadata = { title: "Search profiles" };

export default async function SearchProfilesPage() {
  const profiles = await searchProfileRepository.list();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Search profiles</h1>
          <p className="text-sm text-muted">Criteria used when fetching jobs.</p>
        </div>
        <Link
          href="/search-profiles/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
        >
          New profile
        </Link>
      </header>

      {profiles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          No search profiles yet. Create one to filter what gets fetched.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {profiles.map((profile) => (
            <li key={profile.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium">{profile.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {profile.keywords.length > 0 ? profile.keywords.join(", ") : "no keywords"}
                    {" · "}
                    {profile.locations.length > 0 ? profile.locations.join(", ") : "any location"}
                    {profile.remotePreference ? ` · ${profile.remotePreference.toLowerCase()}` : ""}
                    {profile.salary?.minimum
                      ? ` · from ${profile.salary.minimum} ${profile.salary.currency ?? ""}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <Link
                    href={`/search-profiles/${profile.id}`}
                    className="font-medium text-accent-strong hover:underline"
                  >
                    Edit
                  </Link>
                  <form action={deleteSearchProfileAction}>
                    <input type="hidden" name="id" value={profile.id} />
                    <button type="submit" className="text-danger hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
              {(profile.excludedCompanies && profile.excludedCompanies.length > 0) ||
              (profile.excludedKeywords && profile.excludedKeywords.length > 0) ? (
                <p className="mt-2 text-xs text-muted">
                  Excluding:{" "}
                  {[...(profile.excludedCompanies ?? []), ...(profile.excludedKeywords ?? [])].join(
                    ", ",
                  )}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
