import {
  AddJobNote,
  AnalyzeJobFit,
  AnalyzePendingJobs,
  CreateApplication,
  DeleteSearchProfile,
  GenerateApplicationDocument,
  GetJob,
  IngestJobs,
  ListJobs,
  PrefilterJobs,
  SaveApplicationDocument,
  SaveIntegrationSettings,
  SaveProfile,
  SaveSearchProfile,
  UpdateStatus,
  createIntegrationSettingsReader,
} from "@/application";
import type { JobSourcePort } from "@/application/ports/job-source-port";
import { db } from "@/infrastructure/db/client";
import { DrizzleAnalysisRepository } from "@/infrastructure/db/drizzle-analysis-repository";
import { DrizzleApplicationRepository } from "@/infrastructure/db/drizzle-application-repository";
import { DrizzleCandidateProfileRepository } from "@/infrastructure/db/drizzle-candidate-profile-repository";
import { DrizzleCompanyRepository } from "@/infrastructure/db/drizzle-company-repository";
import { DrizzleDocumentRepository } from "@/infrastructure/db/drizzle-document-repository";
import { DrizzleIntegrationSettingsRepository } from "@/infrastructure/db/drizzle-integration-settings-repository";
import { DrizzleJobRepository } from "@/infrastructure/db/drizzle-job-repository";
import { DrizzleSearchProfileRepository } from "@/infrastructure/db/drizzle-search-profile-repository";
import { DrizzleUploadedCvRepository } from "@/infrastructure/db/drizzle-uploaded-cv-repository";
import { createCvExtractor } from "@/infrastructure/ai/create-cv-extractor";
import { createDocumentGenerator } from "@/infrastructure/ai/create-document-generator";
import { createJobMatcher } from "@/infrastructure/ai/create-job-matcher";
import { ArbeitnowJobSource } from "@/infrastructure/job-sources/arbeitnow/arbeitnow-job-source";
import { FixtureJobSource } from "@/infrastructure/job-sources/fixture/fixture-job-source";
import { HimalayasJobSource } from "@/infrastructure/job-sources/himalayas/himalayas-job-source";
import { RemotiveJobSource } from "@/infrastructure/job-sources/remotive/remotive-job-source";
import { cipherFromEnv } from "@/infrastructure/security/secret-cipher";
import { envDefaultSettings } from "@/infrastructure/settings/env-defaults";

export const jobRepository = new DrizzleJobRepository(db);
export const companyRepository = new DrizzleCompanyRepository(db);
export const applicationRepository = new DrizzleApplicationRepository(db);
export const candidateProfileRepository = new DrizzleCandidateProfileRepository(db);
export const searchProfileRepository = new DrizzleSearchProfileRepository(db);
export const analysisRepository = new DrizzleAnalysisRepository(db);
export const documentRepository = new DrizzleDocumentRepository(db);
export const uploadedCvRepository = new DrizzleUploadedCvRepository(db);
export const integrationSettingsRepository = new DrizzleIntegrationSettingsRepository(db);
export const cvExtractor = createCvExtractor();
export const jobMatcher = createJobMatcher();
export const documentGenerator = createDocumentGenerator();

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
  return [
    new FixtureJobSource(integrationSettingsReader),
    new RemotiveJobSource(undefined, integrationSettingsReader),
    new ArbeitnowJobSource(undefined, integrationSettingsReader),
    new HimalayasJobSource(undefined, integrationSettingsReader),
  ];
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
export const saveProfile = new SaveProfile(candidateProfileRepository);
export const saveSearchProfile = new SaveSearchProfile(searchProfileRepository);
export const deleteSearchProfile = new DeleteSearchProfile(searchProfileRepository);
