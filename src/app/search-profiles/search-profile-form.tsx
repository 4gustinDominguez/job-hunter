"use client";

import { useActionState, useState } from "react";
import { saveSearchProfileAction } from "@/app/_lib/actions";
import type { SearchProfileFormState } from "@/app/_lib/schemas";
import { EMPLOYMENT_TYPES, SENIORITIES } from "@/domain/job/enums";
import type { JobSearchProfile } from "@/domain/search/search-profile";
import { REMOTE_PREFERENCES } from "@/domain/shared/remote-preference";

const initialState: SearchProfileFormState = { errors: {}, message: "" };

interface FormValues {
  id: string;
  name: string;
  keywords: string;
  locations: string;
  remotePreference: string;
  employmentTypes: string[];
  seniority: string[];
  salaryMinimum: string;
  salaryCurrency: string;
  excludedCompanies: string;
  excludedKeywords: string;
}

function initialValues(profile?: JobSearchProfile): FormValues {
  return {
    id: profile?.id ?? "",
    name: profile?.name ?? "",
    keywords: profile?.keywords.join(", ") ?? "",
    locations: profile?.locations.join(", ") ?? "",
    remotePreference: profile?.remotePreference ?? "",
    employmentTypes: profile?.employmentTypes ?? [],
    seniority: profile?.seniority ?? [],
    salaryMinimum: profile?.salary?.minimum?.toString() ?? "",
    salaryCurrency: profile?.salary?.currency ?? "",
    excludedCompanies: profile?.excludedCompanies?.join(", ") ?? "",
    excludedKeywords: profile?.excludedKeywords?.join(", ") ?? "",
  };
}

const fieldClass =
  "h-9 w-full rounded-md border border-line bg-paper px-3 text-sm disabled:bg-surface";

export function SearchProfileForm({ profile }: { profile?: JobSearchProfile }) {
  const [state, formAction, pending] = useActionState(saveSearchProfileAction, initialState);
  const [values, setValues] = useState<FormValues>(() => initialValues(profile));

  const update =
    (field: keyof FormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };

  const toggle = (field: "employmentTypes" | "seniority", option: string) => () => {
    setValues((current) => ({
      ...current,
      [field]: current[field].includes(option)
        ? current[field].filter((item) => item !== option)
        : [...current[field], option],
    }));
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={values.id} />

      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="sp-name" className="text-xs text-muted">
            Name
          </label>
          <input
            id="sp-name"
            name="name"
            value={values.name}
            onChange={update("name")}
            className={fieldClass}
          />
          {state.errors.name ? (
            <p role="alert" className="text-xs text-danger">
              {state.errors.name[0]}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="sp-keywords" className="text-xs text-muted">
              Keywords (comma separated)
            </label>
            <input
              id="sp-keywords"
              name="keywords"
              value={values.keywords}
              onChange={update("keywords")}
              placeholder="typescript, react"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sp-locations" className="text-xs text-muted">
              Locations (comma separated)
            </label>
            <input
              id="sp-locations"
              name="locations"
              value={values.locations}
              onChange={update("locations")}
              placeholder="Madrid, Remote"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sp-remote" className="text-xs text-muted">
              Remote preference
            </label>
            <select
              id="sp-remote"
              name="remotePreference"
              value={values.remotePreference}
              onChange={update("remotePreference")}
              className={fieldClass}
            >
              <option value="">Any</option>
              {REMOTE_PREFERENCES.map((value) => (
                <option key={value} value={value}>
                  {value.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="sp-salary-min" className="text-xs text-muted">
                Minimum salary
              </label>
              <input
                id="sp-salary-min"
                name="salaryMinimum"
                inputMode="numeric"
                value={values.salaryMinimum}
                onChange={update("salaryMinimum")}
                placeholder="45000"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="sp-salary-currency" className="text-xs text-muted">
                Currency
              </label>
              <input
                id="sp-salary-currency"
                name="salaryCurrency"
                value={values.salaryCurrency}
                onChange={update("salaryCurrency")}
                placeholder="EUR"
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        {state.errors.salaryMinimum ? (
          <p role="alert" className="text-xs text-danger">
            {state.errors.salaryMinimum[0]}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs text-muted">Employment types</legend>
          <div className="flex flex-wrap gap-4">
            {EMPLOYMENT_TYPES.map((value) => (
              <label key={value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="employmentTypes"
                  value={value}
                  checked={values.employmentTypes.includes(value)}
                  onChange={toggle("employmentTypes", value)}
                />
                {value.toLowerCase().replace(/_/g, " ")}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs text-muted">Seniority</legend>
          <div className="flex flex-wrap gap-4">
            {SENIORITIES.map((value) => (
              <label key={value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="seniority"
                  value={value}
                  checked={values.seniority.includes(value)}
                  onChange={toggle("seniority", value)}
                />
                {value.toLowerCase()}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="sp-excluded-companies" className="text-xs text-muted">
            Excluded companies (comma separated)
          </label>
          <input
            id="sp-excluded-companies"
            name="excludedCompanies"
            value={values.excludedCompanies}
            onChange={update("excludedCompanies")}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sp-excluded-keywords" className="text-xs text-muted">
            Excluded keywords (comma separated)
          </label>
          <input
            id="sp-excluded-keywords"
            name="excludedKeywords"
            value={values.excludedKeywords}
            onChange={update("excludedKeywords")}
            className={fieldClass}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
        {state.message ? (
          <output aria-live="polite" className="text-sm text-accent-strong">
            {state.message}
          </output>
        ) : null}
      </div>
    </form>
  );
}
