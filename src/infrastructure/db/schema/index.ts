import { relations } from "drizzle-orm";
import { applicationDocuments } from "./application-documents";
import { applications, contacts } from "./applications";
import { candidateProfiles, profileSkills } from "./candidate";
import { companies } from "./companies";
import { jobAnalyses } from "./job-analyses";
import { jobListings, jobs } from "./jobs";

export * from "./application-documents";
export * from "./applications";
export * from "./candidate";
export * from "./companies";
export * from "./integration-settings";
export * from "./job-analyses";
export * from "./jobs";
export * from "./search-profiles";
export * from "./uploaded-cvs";

export const companiesRelations = relations(companies, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
  listings: many(jobListings),
  applications: many(applications),
  analysis: one(jobAnalyses),
}));

export const jobAnalysesRelations = relations(jobAnalyses, ({ one }) => ({
  job: one(jobs, {
    fields: [jobAnalyses.jobId],
    references: [jobs.id],
  }),
}));

export const jobListingsRelations = relations(jobListings, ({ one }) => ({
  job: one(jobs, {
    fields: [jobListings.jobId],
    references: [jobs.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
  contact: one(contacts, {
    fields: [applications.contactId],
    references: [contacts.id],
  }),
  documents: many(applicationDocuments),
}));

export const applicationDocumentsRelations = relations(applicationDocuments, ({ one }) => ({
  application: one(applications, {
    fields: [applicationDocuments.applicationId],
    references: [applications.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  applications: many(applications),
}));

export const candidateProfilesRelations = relations(candidateProfiles, ({ many }) => ({
  skills: many(profileSkills),
}));

export const profileSkillsRelations = relations(profileSkills, ({ one }) => ({
  profile: one(candidateProfiles, {
    fields: [profileSkills.profileId],
    references: [candidateProfiles.id],
  }),
}));
