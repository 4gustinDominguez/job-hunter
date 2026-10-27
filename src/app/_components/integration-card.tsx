"use client";

import { useActionState } from "react";
import { saveIntegrationSettingsAction } from "@/app/_lib/actions";
import type { IntegrationSettingsFormState } from "@/app/_lib/schemas";
import { COUNTRY_OPTIONS } from "@/domain/shared/country";

const initialState: IntegrationSettingsFormState = { errors: {}, message: "" };

const fieldClass =
  "h-9 w-full rounded-md border border-line bg-paper px-3 text-sm disabled:bg-surface";

export interface IntegrationCardSettings {
  provider: string;
  enabled: boolean;
  countries: string[];
  keywords: string[];
  maxItems?: number;
  apiKeyHint?: string;
  hasKeyField: boolean;
  configured: boolean;
}

export function IntegrationCard({ settings }: { settings: IntegrationCardSettings }) {
  const [state, formAction, pending] = useActionState(saveIntegrationSettingsAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
    >
      <input type="hidden" name="provider" value={settings.provider} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            id={`enabled-${settings.provider}`}
            name="enabled"
            type="checkbox"
            defaultChecked={settings.enabled}
            className="h-4 w-4 rounded border-line accent-[var(--color-accent,#2563eb)]"
          />
          <label htmlFor={`enabled-${settings.provider}`} className="font-medium">
            {settings.provider.toLowerCase()}
          </label>
        </div>
        <span className="text-xs text-muted">
          {settings.configured ? "customized" : "env defaults"}
        </span>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs text-muted">
          Countries (none selected = any country; Europe accepts the whole continent)
        </legend>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 max-h-40 overflow-y-auto pr-1">
          {COUNTRY_OPTIONS.map((country) => (
            <label key={country} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                name="countries"
                value={country}
                defaultChecked={settings.countries.includes(country)}
                className="h-3.5 w-3.5 rounded border-line"
              />
              {country}
            </label>
          ))}
        </div>
        {state.errors.countries ? (
          <p role="alert" className="text-xs text-danger">
            {state.errors.countries[0]}
          </p>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`keywords-${settings.provider}`} className="text-xs text-muted">
            Fallback query keywords (comma separated)
          </label>
          <input
            id={`keywords-${settings.provider}`}
            name="keywords"
            defaultValue={settings.keywords.join(", ")}
            placeholder="react, typescript"
            className={fieldClass}
          />
          <p className="text-[11px] text-muted">
            Used when no search profile supplies keywords (Remotive and Himalayas).
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`max-${settings.provider}`} className="text-xs text-muted">
            Max jobs per run
          </label>
          <input
            id={`max-${settings.provider}`}
            name="maxItems"
            type="number"
            min={1}
            max={500}
            defaultValue={settings.maxItems ?? ""}
            placeholder="no cap"
            className={fieldClass}
          />
          {state.errors.maxItems ? (
            <p role="alert" className="text-xs text-danger">
              {state.errors.maxItems[0]}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`key-${settings.provider}`} className="text-xs text-muted">
          API key
        </label>
        {settings.hasKeyField ? (
          <>
            <input
              id={`key-${settings.provider}`}
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder={settings.apiKeyHint ? `stored (${settings.apiKeyHint})` : "not set"}
              className={fieldClass}
            />
            <div className="flex items-center gap-3">
              {settings.apiKeyHint ? (
                <span className="text-[11px] text-muted">stored: {settings.apiKeyHint}</span>
              ) : null}
              {settings.apiKeyHint ? (
                <label className="flex items-center gap-1.5 text-[11px] text-muted">
                  <input type="checkbox" name="clearKey" className="h-3.5 w-3.5 rounded" />
                  remove stored key
                </label>
              ) : null}
            </div>
            {state.errors.apiKey ? (
              <p role="alert" className="text-xs text-danger">
                {state.errors.apiKey[0]}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted">No API key required for this source.</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state.message ? (
          <output aria-live="polite" className="text-xs text-accent-strong">
            {state.message}
          </output>
        ) : null}
      </div>
    </form>
  );
}
