import {
  AddApplicationQuestions,
  AddJobNote,
  AnalyzeJobFit,
  AnalyzePendingJobs,
  CreateApplication,
  DeleteApplicationQuestion,
  DeleteSearchProfile,
  FindQuestionSimilarities,
  GenerateApplicationDocument,
  GetJob,
  IngestJobs,
  ListJobs,
  PrefilterJobs,
  SaveApplicationDocument,
  SaveApplicationQuestionAnswer,
  SaveIntegrationSettings,
  SaveProfile,
  SaveSearchProfile,
  UpdateStatus,
  createIntegrationSettingsReader,
} from "@/application";
import type { JobSourcePort } from "@/application/ports/job-source-port";
import type { LoggerPort } from "@/application/ports/logger-port";
import { db, pool } from "@/infrastructure/db/client";
import { DrizzleAnalysisRepository } from "@/infrastructure/db/drizzle-analysis-repository";
import { DrizzleApplicationQuestionRepository } from "@/infrastructure/db/drizzle-application-question-repository";
import { DrizzleApplicationRepository } from "@/infrastructure/db/drizzle-application-repository";
import { DrizzleQuestionSimilarityRepository } from "@/infrastructure/db/drizzle-question-similarity-repository";
import { DrizzleCandidateProfileRepository } from "@/infrastructure/db/drizzle-candidate-profile-repository";
import { DrizzleCompanyRepository } from "@/infrastructure/db/drizzle-company-repository";
import { DrizzleDocumentRepository } from "@/infrastructure/db/drizzle-document-repository";
import { DrizzleIngestionRunRepository } from "@/infrastructure/db/drizzle-ingestion-run-repository";
import { DrizzleIntegrationSettingsRepository } from "@/infrastructure/db/drizzle-integration-settings-repository";
import { DrizzleJobRepository } from "@/infrastructure/db/drizzle-job-repository";
import { DrizzleSearchProfileRepository } from "@/infrastructure/db/drizzle-search-profile-repository";
import { DrizzleUploadedCvRepository } from "@/infrastructure/db/drizzle-uploaded-cv-repository";
import { createCvExtractor } from "@/infrastructure/ai/create-cv-extractor";
import { createDocumentGenerator } from "@/infrastructure/ai/create-document-generator";
import { createJobMatcher } from "@/infrastructure/ai/create-job-matcher";
import { createQuestionSimilarityAnalyzer } from "@/infrastructure/ai/create-question-similarity";
import { SentryLogger } from "@/infrastructure/logging/sentry-logger";
import { ArbeitnowJobSource } from "@/infrastructure/job-sources/arbeitnow/arbeitnow-job-source";
import { FixtureJobSource } from "@/infrastructure/job-sources/fixture/fixture-job-source";
import { HimalayasJobSource } from "@/infrastructure/job-sources/himalayas/himalayas-job-source";
import { RemotiveJobSource } from "@/infrastructure/job-sources/remotive/remotive-job-source";
import { WwrJobSource } from "@/infrastructure/job-sources/wwr/wwr-job-source";
import { cipherFromEnv } from "@/infrastructure/security/secret-cipher";
import { envDefaultSettings, envEnabledSources } from "@/infrastructure/settings/env-defaults";

// Re-exported for /api/health's deep DB probe — routes never import
// infrastructure directly (hexagonal rule); the container is the only seam.
export { pool };

export const jobRepository = new DrizzleJobRepository(db);
export const companyRepository = new DrizzleCompanyRepository(db);
export const applicationRepository = new DrizzleApplicationRepository(db);
export const applicationQuestionRepository = new DrizzleApplicationQuestionRepository(db);
export const questionSimilarityRepository = new DrizzleQuestionSimilarityRepository(db);
export const candidateProfileRepository = new DrizzleCandidateProfileRepository(db);
export const searchProfileRepository = new DrizzleSearchProfileRepository(db);
export const analysisRepository = new DrizzleAnalysisRepository(db);
export const documentRepository = new DrizzleDocumentRepository(db);
export const uploadedCvRepository = new DrizzleUploadedCvRepository(db);
export const integrationSettingsRepository = new DrizzleIntegrationSettingsRepository(db);
export const ingestionRunRepository = new DrizzleIngestionRunRepository(db);
// Deliberate app logging → Sentry Logs (swappable; no-op without SENTRY_DSN).
export const logger: LoggerPort = new SentryLogger();
export const cvExtractor = createCvExtractor(logger);
export const jobMatcher = createJobMatcher(logger);
export const documentGenerator = createDocumentGenerator(logger);
export const questionSimilarityAnalyzer = createQuestionSimilarityAnalyzer(logger);

// Settings read at request time: rows from /integrations win, env is the
// fallback when a provider has never been configured.
const settingsCipher = cipherFromEnv();
export const integrationSettingsReader = createIntegrationSettingsReader(
  integrationSettingsRepository,
  settingsCipher,
  envDefaultSettings,
);
export const saveIntegrationSettings = new SaveIntegrationSettings(
  integrationSettingsRepository,
  settingsCipher,
);

// Every managed source is constructed; each one consults its settings first
// (disabled → no API call at all), so JOB_SOURCES only sets the initial state.
function resolveJobSources(): JobSourcePort[] {
  const sources: JobSourcePort[] = [
    new RemotiveJobSource(undefined, integrationSettingsReader),
    new ArbeitnowJobSource(undefined, integrationSettingsReader),
    new HimalayasJobSource(undefined, integrationSettingsReader),
    new WwrJobSource(undefined, integrationSettingsReader),
  ];
  if (!process.env.VERCEL && envEnabledSources().has("FIXTURE")) {
    sources.unshift(new FixtureJobSource(integrationSettingsReader));
  }
  return sources;
}

export const ingestJobs = new IngestJobs(resolveJobSources(), jobRepository, companyRepository);
export const prefilterJobs = new PrefilterJobs(jobRepository, candidateProfileRepository);
export const analyzeJobFit = new AnalyzeJobFit(
  jobMatcher,
  jobRepository,
  candidateProfileRepository,
  analysisRepository,
);
export const analyzePendingJobs = new AnalyzePendingJobs(
  analyzeJobFit,
  jobRepository,
  candidateProfileRepository,
  analysisRepository,
);
export const addJobNote = new AddJobNote(jobRepository);
export const generateApplicationDocument = new GenerateApplicationDocument(
  documentGenerator,
  applicationRepository,
  jobRepository,
  candidateProfileRepository,
  analysisRepository,
  documentRepository,
);
export const saveApplicationDocument = new SaveApplicationDocument(documentRepository);
export const listJobs = new ListJobs(jobRepository);
export const getJob = new GetJob(jobRepository);
export const createApplication = new CreateApplication(applicationRepository, jobRepository);
export const updateStatus = new UpdateStatus(applicationRepository);
export const addApplicationQuestions = new AddApplicationQuestions(
  applicationQuestionRepository,
  applicationRepository,
);
export const saveApplicationQuestionAnswer = new SaveApplicationQuestionAnswer(
  applicationQuestionRepository,
);
export const deleteApplicationQuestion = new DeleteApplicationQuestion(
  applicationQuestionRepository,
);
export const findQuestionSimilarities = new FindQuestionSimilarities(
  applicationQuestionRepository,
  questionSimilarityRepository,
  questionSimilarityAnalyzer,
);
export const saveProfile = new SaveProfile(candidateProfileRepository);
export const saveSearchProfile = new SaveSearchProfile(searchProfileRepository);
export const deleteSearchProfile = new DeleteSearchProfile(searchProfileRepository);
