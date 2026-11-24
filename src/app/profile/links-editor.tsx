"use client";

/* oxlint-disable jsx-no-new-function-as-prop -- link rows edit local state; this component renders on interaction, not in a hot loop */

import { useMemo, useRef, useState } from "react";
import { MAX_PROFILE_LINKS, type ProfileLink } from "@/domain/candidate/profile-links";

interface LinkRow extends ProfileLink {
  key: number;
}

const inputClass = "h-8 rounded-md border border-line bg-paper px-2 text-sm";

/**
 * Editor for the profile's links (LinkedIn, GitHub…). Keeps rows as local
 * state and mirrors them into a hidden `name` input — the form submits it
 * like every other profile field.
 */
export function LinksEditor({
  initialLinks,
  name,
}: {
  initialLinks?: ProfileLink[];
  name: string;
}) {
  const [rows, setRows] = useState<LinkRow[]>(() =>
    (initialLinks ?? []).map((link, index) => ({ key: index, label: link.label, url: link.url })),
  );
  const nextKey = useRef(initialLinks?.length ?? 0);

  const payload = useMemo(
    () => JSON.stringify(rows.map(({ label, url }) => ({ label, url }))),
    [rows],
  );

  const update =
    (key: number, field: keyof ProfileLink) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
    };

  const remove = (key: number) => () => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const add = () => {
    setRows((prev) => [...prev, { key: nextKey.current, label: "", url: "" }]);
    nextKey.current += 1;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <input type="hidden" name={name} value={payload} />
      {rows.map((row) => (
        <div key={row.key} className="flex flex-wrap items-center gap-2">
          <input
            value={row.label}
            onChange={update(row.key, "label")}
            placeholder="LinkedIn"
            aria-label="Link label"
            className={`${inputClass} w-32`}
          />
          <input
            value={row.url}
            onChange={update(row.key, "url")}
            placeholder="https://linkedin.com/in/you"
            aria-label="Link URL"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={remove(row.key)}
            aria-label={`Remove ${row.label || "link"}`}
            title="Remove link"
            className="rounded border border-line px-2 py-1 text-sm leading-none text-muted hover:text-danger"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={rows.length >= MAX_PROFILE_LINKS}
        className="self-start rounded border border-line px-2 py-1 text-xs text-muted hover:text-ink disabled:opacity-40"
      >
        + Add link
      </button>
    </div>
  );
}
