"use server";

import { after } from "next/server";
import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { SaveProfileInput, SuggestionDecision } from "@/application";
import {
  AnalysisError,
  CvExtractionError,
  DocumentGenerationError,
  NotFoundError,
  ValidationError,
  cvLayoutSchema,
  recordIngestionRun,
} from "@/application";
import { requireSession } from "./auth";
import { criteriaFromProfile } from "./search-criteria";
import type { ApplicationStatus } from "@/domain/application/enums";
import { normalizeCvTemplate } from "@/domain/candidate/cv-template";
import type { DocumentKind } from "@/domain/documents/generated-document";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import {
  addApplicationQuestions,
  addJobNote,
  analyzeJobFit,
  applicationRepository,
  createApplication,
  cvExtractor,
  deleteApplicationQuestion,
  deleteCvVersion,
  deleteSearchProfile,
  findQuestionSimilarities,
  generateApplicationDocument,
  ingestJobs,
  ingestionRunRepository,
  jobRepository,
  loadCvVersion,
  prefilterJobs,
  resolveProfileSuggestion,
  reviewProfileTexts,
  runAtsCheck,
  saveApplicationDocument,
  saveApplicationQuestionAnswer,
  saveCvLayout,
  saveCvTemplate,
  saveCvVersion,
  saveIntegrationSettings,
  saveProfile,
  saveSearchProfile,
  searchProfileRepository,
  updateStatus,
  uploadedCvRepository,
} from "./container";
import type {
  ApplicationQuestionsState,
  AtsCheckState,
  CvLayoutState,
  CvTemplateState,
  CvVersionsState,
  DocumentActionState,
  FetchJobsState,
  ImportCvState,
  IntegrationSettingsFormState,
  ProfileFormState,
  ProfileFormValues,
  SearchProfileFormState,
  SearchProfileFormValues,
  SuggestionsState,
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
    links: values.links,
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

export async function addApplicationQuestionsAction(
  _prevState: ApplicationQuestionsState,
  formData: FormData,
): Promise<ApplicationQuestionsState> {
  await requireSession();
  const applicationId = String(formData.get("applicationId") ?? "");
  // Dynamic rows: repeated `question[]`/`answer[]` fields, one pair per row.
  const questions = formData.getAll("question").map(String);
  const answers = formData.getAll("answer").map(String);
  try {
    const added = await addApplicationQuestions.run(
      applicationId,
      questions.map((question, index) => ({ question, answer: answers[index] ?? "" })),
    );
    refresh();
    return { message: `Added ${added.length} question${added.length === 1 ? "" : "s"}.` };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return { message: error.message, error: true };
    }
    console.warn("[questions] add failed:", error);
    return { message: "Adding questions failed unexpectedly. Try again.", error: true };
  }
}

export async function saveApplicationQuestionAnswerAction(
  _prevState: ApplicationQuestionsState,
  formData: FormData,
): Promise<ApplicationQuestionsState> {
  await requireSession();
  const questionId = String(formData.get("questionId") ?? "");
  const answer = String(formData.get("answer") ?? "");
  try {
    await saveApplicationQuestionAnswer.run(questionId, answer);
    refresh();
    return { message: "Answer saved." };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return { message: error.message, error: true };
    }
    console.warn("[questions] save answer failed:", error);
    return { message: "Saving the answer failed unexpectedly. Try again.", error: true };
  }
}

export async function deleteApplicationQuestionAction(formData: FormData): Promise<void> {
  await requireSession();
  const questionId = String(formData.get("questionId") ?? "");
  try {
    await deleteApplicationQuestion.run(questionId);
  } catch (error) {
    if (error instanceof NotFoundError) return; // already gone — nothing to do
    throw error;
  }
  refresh();
}

export async function findSimilarQuestionsAction(
  _prevState: ApplicationQuestionsState,
  formData: FormData,
): Promise<ApplicationQuestionsState> {
  await requireSession();
  const questionId = String(formData.get("questionId") ?? "");
  try {
    const record = await findQuestionSimilarities.run(questionId);
    refresh();
    return {
      message:
        record.matches.length > 0
          ? `Found ${record.matches.length} similar question${record.matches.length === 1 ? "" : "s"}.`
          : "No similar questions found in previous answers.",
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return { message: error.message, error: true };
    }
    if (error instanceof AnalysisError) {
      return { message: error.message, error: true };
    }
    console.warn("[similarity] find similar failed:", error);
    return {
      message: "Searching for similar questions failed unexpectedly. Try again.",
      error: true,
    };
  }
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

/** First error per field, prefixed with its full path (e.g. "skills.0.name: …"). */
function issuesByField(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "form");
    const location = issue.path.length > 1 ? `${issue.path.join(".")}: ` : "";
    (errors[field] ??= []).push(`${location}${issue.message}`);
  }
  return errors;
}

/** True when the value is a JSON array whose first item has all the given keys. */
function jsonFirstHasKeys(value: unknown, keys: string[]): boolean {
  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    const first = parsed[0];
    return typeof first === "object" && first !== null && keys.every((key) => key in first);
  } catch {
    return false;
  }
}

/** Pasted JSON that clearly belongs to the other textarea (skills ↔ experience). */
function crossPasteIssue(
  raw: Record<string, unknown>,
): { field: string; message: string } | undefined {
  if (jsonFirstHasKeys(raw.skills, ["company", "position"])) {
    return {
      field: "skills",
      message:
        "This looks like your Experience JSON (entries with company/position) — paste it into the Experience field instead.",
    };
  }
  if (jsonFirstHasKeys(raw.experience, ["name", "category"])) {
    return {
      field: "experience",
      message:
        "This looks like your Skills JSON (entries with name/category) — paste it into the Skills field instead.",
    };
  }
  return undefined;
}

/** All profile-form fields as the form schema sees them (shared by save + version). */
function readProfileForm(formData: FormData): Record<string, unknown> {
  return {
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
    links: String(formData.get("links") ?? "[]"),
  };
}

export async function saveProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  await requireSession();
  const raw = readProfileForm(formData);
  const crossPaste = crossPasteIssue(raw);
  if (crossPaste) {
    return { errors: { [crossPaste.field]: [crossPaste.message] }, message: "" };
  }
  const parsed = profileFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: issuesByField(parsed.error.issues), message: "" };
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

export async function saveCvLayoutAction(
  _prevState: CvLayoutState,
  formData: FormData,
): Promise<CvLayoutState> {
  await requireSession();
  const raw = String(formData.get("layout") ?? "[]");
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { message: "Layout could not be read." };
  }
  const parsed = cvLayoutSchema.safeParse(payload);
  if (!parsed.success) {
    return { message: "Layout is invalid." };
  }
  try {
    await saveCvLayout.run(parsed.data);
  } catch (error) {
    if (error instanceof ValidationError) {
      return { message: error.message };
    }
    throw error;
  }
  revalidatePath("/profile");
  revalidatePath("/cv");
  return { message: "Layout saved." };
}

export async function saveCvTemplateAction(
  _prevState: CvTemplateState,
  formData: FormData,
): Promise<CvTemplateState> {
  await requireSession();
  const raw = String(formData.get("config") ?? "{}");
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { message: "Template settings could not be read." };
  }
  try {
    await saveCvTemplate.run(normalizeCvTemplate(payload));
  } catch (error) {
    if (error instanceof ValidationError) {
      return { message: error.message };
    }
    throw error;
  }
  revalidatePath("/cv");
  revalidatePath("/cv/builder");
  return { message: "Template saved." };
}

export async function saveCvVersionAction(
  _prevState: CvVersionsState,
  formData: FormData,
): Promise<CvVersionsState> {
  await requireSession();
  // Versions snapshot the form AS IT IS (unsaved edits included) and never
  // write to the profile — only Save profile or Load change the content.
  const raw = readProfileForm(formData);
  const crossPaste = crossPasteIssue(raw);
  if (crossPaste) {
    return { ok: false, message: crossPaste.message };
  }
  const parsed = profileFormSchema.safeParse(raw);
  if (!parsed.success) {
    const first = Object.values(issuesByField(parsed.error.issues)).flat()[0];
    return {
      ok: false,
      message: first ? `Fix the form first: ${first}` : "The form has errors.",
    };
  }
  try {
    const version = await saveCvVersion.run(
      String(formData.get("label") ?? ""),
      toSaveProfileInput(parsed.data),
    );
    revalidatePath("/profile");
    return { ok: true, message: `Saved "${version.label}".` };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

export async function loadCvVersionAction(
  _prevState: CvVersionsState,
  formData: FormData,
): Promise<CvVersionsState> {
  await requireSession();
  try {
    await loadCvVersion.run(String(formData.get("versionId") ?? ""));
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      return { message: error.message };
    }
    throw error;
  }
  revalidatePath("/profile");
  revalidatePath("/cv");
  return { message: "Version loaded." };
}

export async function reviewProfileTextsAction(
  _prevState: SuggestionsState,
  _formData: FormData,
): Promise<SuggestionsState> {
  await requireSession();
  try {
    const result = await reviewProfileTexts.run();
    revalidatePath("/profile");
    return {
      message:
        result.created > 0
          ? `Found ${result.created} improvement${result.created === 1 ? "" : "s"} in ${result.reviewed} texts.`
          : `Reviewed ${result.reviewed} texts — nothing worth changing.`,
      error: false,
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AnalysisError) {
      return { message: error.message, error: true };
    }
    console.warn("[profile-review] review failed:", error);
    return { message: "The review failed unexpectedly. Try again.", error: true };
  }
}

export async function resolveProfileSuggestionAction(
  _prevState: SuggestionsState,
  formData: FormData,
): Promise<SuggestionsState> {
  await requireSession();
  // The decision lives in the button name — if neither arrives, we do nothing.
  const acceptId = String(formData.get("acceptId") ?? "");
  const dismissId = String(formData.get("dismissId") ?? "");
  if (acceptId === "" && dismissId === "") {
    return { message: "The request was incomplete — try again.", error: true };
  }
  const decision: SuggestionDecision = acceptId !== "" ? "accept" : "dismiss";
  const suggestionId = acceptId !== "" ? acceptId : dismissId;
  try {
    await resolveProfileSuggestion.run(
      suggestionId,
      decision,
      decision === "accept" ? String(formData.get("text") ?? "") : undefined,
    );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return { message: error.message, error: true };
    }
    console.warn("[profile-review] resolve failed:", error);
    return { message: "Handling the suggestion failed unexpectedly. Try again.", error: true };
  }
  revalidatePath("/profile");
  revalidatePath("/cv");
  return {
    message:
      decision === "dismiss" ? "Suggestion dismissed." : "Suggestion applied to your profile.",
    error: false,
  };
}

export async function runAtsCheckAction(
  _prevState: AtsCheckState,
  _formData: FormData,
): Promise<AtsCheckState> {
  await requireSession();
  try {
    const report = await runAtsCheck.run();
    return { report };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { message: error.message, error: true };
    }
    console.warn("[ats] check failed:", error);
    return { message: "The ATS check failed unexpectedly. Try again.", error: true };
  }
}

export async function deleteCvVersionAction(formData: FormData): Promise<void> {
  await requireSession();
  const versionId = String(formData.get("versionId") ?? "");
  try {
    await deleteCvVersion.run(versionId);
  } catch (error) {
    if (error instanceof NotFoundError) return; // already gone — nothing to do
    throw error;
  }
  revalidatePath("/profile");
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
