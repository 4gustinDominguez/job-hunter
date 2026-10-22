"use client";

import { useActionState } from "react";
import { fetchJobsAction } from "@/app/_lib/actions";
import type { FetchJobsState } from "@/app/_lib/schemas";

const initialState: FetchJobsState = { message: "" };

export function FetchJobsForm({ profiles }: { profiles: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(fetchJobsAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="fetch-profile" className="text-xs text-muted">
          Using search profile
        </label>
        <select
          id="fetch-profile"
          name="profileId"
          defaultValue=""
          className="h-9 rounded-md border border-line bg-surface px-2 text-sm"
        >
          <option value="">All jobs (no filters)</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Fetching…" : "Fetch jobs"}
      </button>
      {state.message ? (
        <output aria-live="polite" className="w-full text-sm text-accent-strong">
          {state.message}
        </output>
      ) : null}
    </form>
  );
}
