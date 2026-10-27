import type { Metadata } from "next";
import { MANAGED_JOB_SOURCES, SOURCES_WITH_API_KEY } from "@/domain/job/enums";
import { envDefaultSettings } from "@/infrastructure/settings/env-defaults";
import { IntegrationCard } from "../_components/integration-card";
import { integrationSettingsRepository } from "../_lib/container";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const stored = await integrationSettingsRepository.list();
  const byProvider = new Map(stored.map((row) => [row.provider, row]));

  const cards = MANAGED_JOB_SOURCES.map((provider) => {
    const row = byProvider.get(provider);
    const fallback = envDefaultSettings(provider);
    return {
      provider,
      enabled: row?.enabled ?? fallback.enabled,
      countries: row?.countries ?? fallback.countries,
      keywords: row?.keywords ?? fallback.keywords,
      maxItems: row?.maxItems ?? fallback.maxItems,
      apiKeyHint: row?.apiKeyHint,
      hasKeyField: SOURCES_WITH_API_KEY.includes(provider),
      configured: row !== undefined,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-muted">
            Per-source settings: toggle, countries, keywords and API keys. Changes apply on the next
            fetch — no redeploy.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <IntegrationCard key={card.provider} settings={card} />
        ))}
      </div>

      <section className="rounded-lg border border-line bg-surface p-4 text-xs text-muted">
        <p>
          Sources without a saved row follow <code className="font-mono">JOB_SOURCES</code> from the
          environment. API keys are encrypted at rest with{" "}
          <code className="font-mono">SETTINGS_SECRET</code> — if it is missing, key fields are
          read-only until you add it.
        </p>
      </section>
    </div>
  );
}
