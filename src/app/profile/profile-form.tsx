"use client";

import { useActionState, useState } from "react";
import { saveProfileAction } from "@/app/_lib/actions";
import type { ProfileFormState } from "@/app/_lib/schemas";
import type { SaveProfileInput } from "@/application/profile/save-profile";
import { EMPLOYMENT_TYPES } from "@/domain/job/enums";
import { REMOTE_PREFERENCES } from "@/domain/shared/remote-preference";

const initialState: ProfileFormState = { errors: {}, message: "" };

interface FormValues {
  id: string;
  name: string;
  email: string;
  phone: string;
  summary: string;
  city: string;
  region: string;
  country: string;
  desiredRoles: string;
  desiredLocations: string;
  remotePreference: string;
  salaryMinimum: string;
  salaryCurrency: string;
  excludedCompanies: string;
  employmentTypes: string[];
  experience: string;
  skills: string;
  projects: string;
  education: string;
}

function initialValues(profile?: SaveProfileInput): FormValues {
  return {
    id: profile?.id ?? "",
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    summary: profile?.summary ?? "",
    city: profile?.location?.city ?? "",
    region: profile?.location?.region ?? "",
    country: profile?.location?.country ?? "",
    desiredRoles: profile?.preferences.desiredRoles.join(", ") ?? "",
    desiredLocations: profile?.preferences.desiredLocations.join(", ") ?? "",
    remotePreference: profile?.preferences.remotePreference ?? "ANY",
    salaryMinimum: profile?.preferences.salaryExpectation?.minimum?.toString() ?? "",
    salaryCurrency: profile?.preferences.salaryExpectation?.currency ?? "",
    excludedCompanies: profile?.preferences.excludedCompanies.join(", ") ?? "",
    employmentTypes: profile?.preferences.employmentTypes ?? [],
    experience: JSON.stringify(profile?.experience ?? [], null, 2),
    skills: JSON.stringify(profile?.skills ?? [], null, 2),
    projects: JSON.stringify(profile?.projects ?? [], null, 2),
    education: JSON.stringify(profile?.education ?? [], null, 2),
  };
}

const inputClass = "h-9 w-full rounded-md border border-line bg-paper px-3 text-sm";
const jsonClass =
  "min-h-36 w-full rounded-md border border-line bg-paper p-3 font-mono text-xs leading-relaxed";

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs text-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ProfileForm({
  profile,
  imported = false,
}: {
  profile?: SaveProfileInput;
  imported?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveProfileAction, initialState);
  const [values, setValues] = useState<FormValues>(() => initialValues(profile));

  const update =
    (field: keyof FormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };

  const toggleEmployment = (option: string) => () => {
    setValues((current) => ({
      ...current,
      employmentTypes: current.employmentTypes.includes(option)
        ? current.employmentTypes.filter((item) => item !== option)
        : [...current.employmentTypes, option],
    }));
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {imported ? (
        <p className="rounded-md border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-strong">
          Generated from your CV — review every field before saving.
        </p>
      ) : null}
      <input type="hidden" name="id" value={values.id} />

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-medium">Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="pf-name" error={state.errors.name?.[0]}>
            <input
              id="pf-name"
              name="name"
              value={values.name}
              onChange={update("name")}
              className={inputClass}
            />
          </Field>
          <Field label="Email" htmlFor="pf-email" error={state.errors.email?.[0]}>
            <input
              id="pf-email"
              name="email"
              type="email"
              value={values.email}
              onChange={update("email")}
              className={inputClass}
            />
          </Field>
          <Field label="Phone" htmlFor="pf-phone">
            <input
              id="pf-phone"
              name="phone"
              value={values.phone}
              onChange={update("phone")}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City" htmlFor="pf-city">
              <input
                id="pf-city"
                name="city"
                value={values.city}
                onChange={update("city")}
                className={inputClass}
              />
            </Field>
            <Field label="Region" htmlFor="pf-region">
              <input
                id="pf-region"
                name="region"
                value={values.region}
                onChange={update("region")}
                className={inputClass}
              />
            </Field>
            <Field label="Country" htmlFor="pf-country">
              <input
                id="pf-country"
                name="country"
                value={values.country}
                onChange={update("country")}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
        <Field label="Summary" htmlFor="pf-summary">
          <textarea
            id="pf-summary"
            name="summary"
            rows={3}
            value={values.summary}
            onChange={update("summary")}
            className={jsonClass}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-medium">Job preferences</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Desired roles (comma separated)"
            htmlFor="pf-roles"
            error={state.errors.desiredRoles?.[0]}
          >
            <input
              id="pf-roles"
              name="desiredRoles"
              value={values.desiredRoles}
              onChange={update("desiredRoles")}
              placeholder="Full Stack Developer"
              className={inputClass}
            />
          </Field>
          <Field label="Desired locations (comma separated)" htmlFor="pf-desired-locations">
            <input
              id="pf-desired-locations"
              name="desiredLocations"
              value={values.desiredLocations}
              onChange={update("desiredLocations")}
              placeholder="Madrid, Remote"
              className={inputClass}
            />
          </Field>
          <Field label="Remote preference" htmlFor="pf-remote">
            <select
              id="pf-remote"
              name="remotePreference"
              value={values.remotePreference}
              onChange={update("remotePreference")}
              className={inputClass}
            >
              {REMOTE_PREFERENCES.map((value) => (
                <option key={value} value={value}>
                  {value.toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Salary expectation"
              htmlFor="pf-salary-min"
              error={state.errors.salaryMinimum?.[0]}
            >
              <input
                id="pf-salary-min"
                name="salaryMinimum"
                inputMode="numeric"
                value={values.salaryMinimum}
                onChange={update("salaryMinimum")}
                placeholder="55000"
                className={inputClass}
              />
            </Field>
            <Field label="Currency" htmlFor="pf-salary-currency">
              <input
                id="pf-salary-currency"
                name="salaryCurrency"
                value={values.salaryCurrency}
                onChange={update("salaryCurrency")}
                placeholder="EUR"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

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
                  onChange={toggleEmployment(value)}
                />
                {value.toLowerCase().replace(/_/g, " ")}
              </label>
            ))}
          </div>
          {state.errors.employmentTypes ? (
            <p role="alert" className="text-xs text-danger">
              {state.errors.employmentTypes[0]}
            </p>
          ) : null}
        </fieldset>

        <Field label="Excluded companies (comma separated)" htmlFor="pf-excluded-companies">
          <input
            id="pf-excluded-companies"
            name="excludedCompanies"
            value={values.excludedCompanies}
            onChange={update("excludedCompanies")}
            className={inputClass}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Experience</h2>
          <p className="text-xs text-muted">JSON array</p>
        </div>
        <Field
          label="Experience"
          htmlFor="pf-experience"
          error={state.errors.experience?.[0]}
          hint='[{"company":"Acme","position":"Developer","startDate":"2022-03-01","description":"…","achievements":[],"skills":["TypeScript"]}]'
        >
          <textarea
            id="pf-experience"
            name="experience"
            rows={8}
            value={values.experience}
            onChange={update("experience")}
            className={jsonClass}
            spellCheck={false}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Skills</h2>
          <p className="text-xs text-muted">JSON array</p>
        </div>
        <Field
          label="Skills"
          htmlFor="pf-skills"
          error={state.errors.skills?.[0]}
          hint='[{"name":"TypeScript","category":"PROGRAMMING","level":"EXPERT","yearsOfExperience":6}] · categories: PROGRAMMING, FRAMEWORK, TOOL, SOFT_SKILL, LANGUAGE · levels: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT'
        >
          <textarea
            id="pf-skills"
            name="skills"
            rows={6}
            value={values.skills}
            onChange={update("skills")}
            className={jsonClass}
            spellCheck={false}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Projects</h2>
          <p className="text-xs text-muted">JSON array</p>
        </div>
        <Field
          label="Projects"
          htmlFor="pf-projects"
          error={state.errors.projects?.[0]}
          hint='[{"name":"Traillog","description":"…","technologies":["React"],"highlights":["1k stars"]}]'
        >
          <textarea
            id="pf-projects"
            name="projects"
            rows={6}
            value={values.projects}
            onChange={update("projects")}
            className={jsonClass}
            spellCheck={false}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Education</h2>
          <p className="text-xs text-muted">JSON array</p>
        </div>
        <Field
          label="Education"
          htmlFor="pf-education"
          error={state.errors.education?.[0]}
          hint='[{"institution":"UPM","degree":"Bachelor","field":"Computer Science","startDate":"2015-09-01","endDate":"2019-06-15"}]'
        >
          <textarea
            id="pf-education"
            name="education"
            rows={6}
            value={values.education}
            onChange={update("education")}
            className={jsonClass}
            spellCheck={false}
          />
        </Field>
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
