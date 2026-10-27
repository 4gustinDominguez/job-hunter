"use server";

import { after } from "next/server";
import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { SaveProfileInput } from "@/application";
import {
  CvExtractionError,
  DocumentGenerationError,
  NotFoundError,
  ValidationError,
  recordIngestionRun,
} from "@/application";
import { requireSession } from "./auth";
import { criteriaFromProfile } from "./search-criteria";
import type { ApplicationStatus } from "@/domain/application/enums";
import type { DocumentKind } from "@/domain/documents/generated-document";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import {
  addJobNote,
  analyzeJobFit,
  applicationRepository,
  createApplication,
  cvExtractor,
  deleteSearchProfile,
  generateApplicationDocument,
  ingestJobs,
  ingestionRunRepository,
  jobRepository,
  prefilterJobs,
  saveApplicationDocument,
  saveIntegrationSettings,
  saveProfile,
  saveSearchProfile,
  searchProfileRepository,
  updateStatus,
  uploadedCvRepository,
} from "./container";
import type {
  DocumentActionState,
  FetchJobsState,
  ImportCvState,
  IntegrationSettingsFormState,
  ProfileFormState,
  ProfileFormValues,
  SearchProfileFormState,
  SearchProfileFormValues,
} from "./schemas";
import {
  integrationSettingsFormSchema,
  profileFormSchema,
  searchProfileFormSchema,
} from "./schemas";

function toSaveProfileInput(values: ProfileFormValues): SaveProfileInput {
  const hasLocation = Boolean(values.city || values.region || values.country);
  return {
    id: values.id === "" ? undefined : values.id,
    name: values.name,
    email: values.email,
    phone: values.phone || undefined,
    summary: values.summary || undefined,
    location: hasLocation
      ? {
          city: values.city || undefined,
          region: values.region || undefined,
          country: values.country || undefined,
          isRemote: false,
        }
      : undefined,
    experience: values.experience.map((item) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
      startDate: new Date(item.startDate),
      endDate: item.endDate ? new Date(item.endDate) : undefined,
    })),
    skills: values.skills.map((item) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
      lastUsed: item.lastUsed ? new Date(item.lastUsed) : undefined,
    })),
    projects: values.projects.map((item) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
    })),
    education: values.education.map((item) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
      startDate: new Date(item.startDate),
      endDate: item.endDate ? new Date(item.endDate) : undefined,
    })),
    preferences: {
      desiredRoles: values.desiredRoles,
      desiredLocations: values.desiredLocations,
      remotePreference: values.remotePreference,
      salaryExpectation:
        values.salaryMinimum !== undefined
          ? { minimum: values.salaryMinimum, currency: values.salaryCurrency || "EUR" }
          : undefined,
      excludedCompanies: values.excludedCompanies,
      employmentTypes: values.employmentTypes,
    },
  };
}

function toSearchProfileInput(values: SearchProfileFormValues) {
  const salary =
    values.salaryMinimum !== undefined || values.salaryCurrency
      ? { minimum: values.salaryMinimum, currency: values.salaryCurrency || undefined }
      : undefined;
  return {
    id: values.id === "" ? undefined : values.id,
    name: values.name,
    keywords: values.keywords,
    locations: values.locations,
    remotePreference: values.remotePreference,
    employmentTypes: values.employmentTypes.length > 0 ? values.employmentTypes : undefined,
    seniority: values.seniority.length > 0 ? values.seniority : undefined,
    salary,
    excludedCompanies: values.excludedCompanies.length > 0 ? values.excludedCompanies : undefined,
    excludedKeywords: values.excludedKeywords.length > 0 ? values.excludedKeywords : undefined,
  };
}

export async function fetchJobsAction(
  _prevState: FetchJobsState,
  formData: FormData,
): Promise<FetchJobsState> {
  await requireSession();
  const profileId = String(formData.get("profileId") ?? "").trim();
  let criteria: JobSearchCriteria = { keywords: [] };
  if (profileId) {
    const profile = await searchProfileRepository.getById(profileId);
    if (profile) {
      criteria = criteriaFromProfile(profile);
    }
  }
  // Sources take tens of seconds — run ingestion in the background so the form
  // returns immediately instead of freezing the page until it all completes
  // (user feedback 2026-10-23). recordIngestionRun (phase 11) leaves a row so
  // the dashboard can show "last run" without opening Vercel logs.
  after(async () => {
    try {
      await recordIngestionRun(ingestionRunRepository, "manual", async () => {
        const result = await ingestJobs.run(criteria);
        const prefilter = await prefilterJobs.run();
        console.log(
          `[fetch-jobs] done: fetched ${result.fetched} · created ${result.created} · attached ${result.attached} · skipped ${result.skipped} · prefilter queued ${prefilter.pending} (skipped ${prefilter.skipped})`,
        );
        for (const error of result.errors) {
          console.error(`[fetch-jobs] source error — ${error.source}: ${error.message}`);
        }
        return {
          fetched: result.fetched,
          created: result.created,
          attached: result.attached,
          skipped: result.skipped,
          prefilterQueued: prefilter.pending,
          prefilterSkipped: prefilter.skipped,
          errors: result.errors.map((error) => ({
            stage: "ingest" as const,
            source: error.source,
            message: error.message,
          })),
        };
      });
    } catch (error) {
      console.error("[fetch-jobs] background ingestion failed:", error);
    }
  });
  return {
    message: "Ingestion started in the background — refresh in a few seconds to see new jobs.",
  };
}

export async function analyzeJobFitAction(formData: FormData): Promise<void> {
  await requireSession();
  const jobId = String(formData.get("jobId") ?? "");
  try {
    await analyzeJobFit.run(jobId);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    console.warn(`[analyze] manual analysis failed for ${jobId}:`, error);
  }
  refresh();
}

export async function addJobNoteAction(formData: FormData): Promise<void> {
  await requireSession();
  const jobId = String(formData.get("jobId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return;
  await addJobNote.run(jobId, note);
  refresh();
}

export async function generateApplicationDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  await requireSession();
  const applicationId = String(formData.get("applicationId") ?? "");
  const kind = String(formData.get("kind") ?? "") as DocumentKind;
  try {
    const doc = await generateApplicationDocument.run(applicationId, kind);
    refresh();
    return {
      message: `${kind === "COVER_LETTER" ? "Cover letter" : "Tailored CV"} generated with ${doc.model} — review it below before using it.`,
    };
  } catch (error) {
    if (error instanceof DocumentGenerationError || error instanceof ValidationError) {
      return { message: error.message, error: true };
    }
    if (error instanceof NotFoundError) {
      return { message: error.message, error: true };
    }
    console.warn("[generate-doc] action failed:", error);
    return { message: "Document generation failed unexpectedly. Try again.", error: true };
  }
}

export async function saveApplicationDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  await requireSession();
  const applicationId = String(formData.get("applicationId") ?? "");
  const kind = String(formData.get("kind") ?? "") as DocumentKind;
  const content = String(formData.get("content") ?? "");
  try {
    await saveApplicationDocument.run(applicationId, kind, content);
    refresh();
    return { message: "Saved." };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return { message: error.message, error: true };
    }
    console.warn("[save-doc] action failed:", error);
    return { message: "Saving failed unexpectedly. Try again.", error: true };
  }
}

export async function createApplicationAction(formData: FormData): Promise<void> {
  await requireSession();
  const jobId = String(formData.get("jobId") ?? "");
  await createApplication.run({ jobId });
  redirect("/applications");
}

export async function transitionApplicationAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("applicationId") ?? "");
  const next = String(formData.get("next") ?? "") as ApplicationStatus;
  await updateStatus.run(id, next);
  refresh();
}

export async function addNoteAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("applicationId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return;
  const current = await applicationRepository.getById(id);
  if (!current) {
    throw new NotFoundError("Application", id);
  }
  await updateStatus.run(id, current.status, { note });
  refresh();
}

const MAX_CV_BYTES = 3 * 1024 * 1024;

export async function importProfileFromCvAction(
  _prevState: ImportCvState,
  formData: FormData,
): Promise<ImportCvState> {
  await requireSession();
  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF file first." };
  }
  const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) {
    return { error: "Only PDF files are supported." };
  }
  if (file.size > MAX_CV_BYTES) {
    return { error: "The file is larger than 3 MB. Compress the PDF or use the manual form." };
  }
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const draft = await cvExtractor.extract(new Uint8Array(bytes), {
      filename: file.name,
    });
    // Keep the PDF itself on record (single-row store) — it is ground truth,
    // independent of how well the extraction went.
    await uploadedCvRepository.save({ filename: file.name, content: bytes });
    refresh();
    return { draft };
  } catch (error) {
    // Always log the cause — Vercel runtime logs are the only window into
    // production failures (user feedback 2026-10-23: "logs don't say why").
    // Never log the CV content or draft (PII).
    if (error instanceof CvExtractionError) {
      console.error(`[import-cv] extraction failed (${file.name}):`, error.message);
      return { error: error.message };
    }
    console.error(`[import-cv] unexpected failure (${file.name}):`, error);
    throw error;
  }
}

export async function saveProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  await requireSession();
  const raw = {
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    city: String(formData.get("city") ?? ""),
    region: String(formData.get("region") ?? ""),
    country: String(formData.get("country") ?? ""),
    desiredRoles: String(formData.get("desiredRoles") ?? ""),
    desiredLocations: String(formData.get("desiredLocations") ?? ""),
    remotePreference: String(formData.get("remotePreference") ?? "ANY"),
    salaryMinimum: String(formData.get("salaryMinimum") ?? ""),
    salaryCurrency: String(formData.get("salaryCurrency") ?? ""),
    excludedCompanies: String(formData.get("excludedCompanies") ?? ""),
    employmentTypes: formData
      .getAll("employmentTypes")
      .filter((value): value is string => typeof value === "string"),
    experience: String(formData.get("experience") ?? "[]"),
    skills: String(formData.get("skills") ?? "[]"),
    projects: String(formData.get("projects") ?? "[]"),
    education: String(formData.get("education") ?? "[]"),
  };
  const parsed = profileFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "" };
  }
  try {
    await saveProfile.run(toSaveProfileInput(parsed.data));
    return { errors: {}, message: "Profile saved." };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { errors: { [error.field]: [error.message] }, message: "" };
    }
    throw error;
  }
}

export async function saveSearchProfileAction(
  _prevState: SearchProfileFormState,
  formData: FormData,
): Promise<SearchProfileFormState> {
  await requireSession();
  const raw = {
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    keywords: String(formData.get("keywords") ?? ""),
    locations: String(formData.get("locations") ?? ""),
    remotePreference: String(formData.get("remotePreference") ?? ""),
    employmentTypes: formData
      .getAll("employmentTypes")
      .filter((value): value is string => typeof value === "string"),
    seniority: formData
      .getAll("seniority")
      .filter((value): value is string => typeof value === "string"),
    salaryMinimum: String(formData.get("salaryMinimum") ?? ""),
    salaryCurrency: String(formData.get("salaryCurrency") ?? ""),
    excludedCompanies: String(formData.get("excludedCompanies") ?? ""),
    excludedKeywords: String(formData.get("excludedKeywords") ?? ""),
  };
  const parsed = searchProfileFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "" };
  }
  try {
    await saveSearchProfile.run(toSearchProfileInput(parsed.data));
  } catch (error) {
    if (error instanceof ValidationError) {
      return { errors: { [error.field]: [error.message] }, message: "" };
    }
    throw error;
  }
  redirect("/search-profiles");
}

export async function deleteSearchProfileAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  await deleteSearchProfile.run(id);
  refresh();
}

export async function saveIntegrationSettingsAction(
  _prevState: IntegrationSettingsFormState,
  formData: FormData,
): Promise<IntegrationSettingsFormState> {
  await requireSession();
  const raw = {
    provider: String(formData.get("provider") ?? ""),
    enabled: formData.get("enabled") === "on",
    countries: formData
      .getAll("countries")
      .filter((value): value is string => typeof value === "string"),
    keywords: String(formData.get("keywords") ?? ""),
    maxItems: String(formData.get("maxItems") ?? ""),
    apiKey: String(formData.get("apiKey") ?? ""),
    clearKey: formData.get("clearKey") === "on",
  };
  const parsed = integrationSettingsFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "" };
  }
  try {
    const apiKey = raw.clearKey ? "" : raw.apiKey.trim() === "" ? undefined : raw.apiKey.trim();
    await saveIntegrationSettings.run({
      provider: parsed.data.provider,
      enabled: parsed.data.enabled,
      countries: parsed.data.countries,
      keywords: parsed.data.keywords,
      maxItems: parsed.data.maxItems,
      apiKey,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { errors: { [error.field]: [error.message] }, message: "" };
    }
    // Never log the form data — it may contain an API key (PII/secret).
    console.error("[integrations] save failed:", error);
    throw error;
  }
  revalidatePath("/integrations");
  return { errors: {}, message: "Saved — effective on the next fetch, no redeploy needed." };
}

export async function dismissJobAction(formData: FormData): Promise<void> {
  await requireSession();
  const jobId = String(formData.get("jobId") ?? "");
  const dismissed = formData.get("dismissed") !== "false";
  await jobRepository.setDismissed(jobId, dismissed);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  refresh();
}
