import type { Education } from "@/domain/candidate/education";
import type { Experience } from "@/domain/candidate/experience";
import type { Project } from "@/domain/candidate/project";
import type { Skill } from "@/domain/candidate/skill";
import type { CvLayout } from "@/domain/candidate/cv-layout";
import type { CvTemplateConfig } from "@/domain/candidate/cv-template";
import type { ProfileLink } from "@/domain/candidate/profile-links";
import type { EmploymentType } from "@/domain/job/enums";
import type { Location } from "@/domain/shared/location";
import type { RemotePreference } from "@/domain/shared/remote-preference";

export interface JobPreferences {
  desiredRoles: string[];
  desiredLocations: string[];
  remotePreference: RemotePreference;
  salaryExpectation?: {
    minimum: number;
    currency: string;
  };
  excludedCompanies: string[];
  employmentTypes: EmploymentType[];
}

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: Location;
  summary?: string;
  experience: Experience[];
  skills: Skill[];
  projects: Project[];
  education: Education[];
  /** External links (LinkedIn, GitHub…); shown in the CV header when enabled. */
  links?: ProfileLink[];
  /** Section order/visibility of the public CV; absent = the default order. */
  cvLayout?: CvLayout;
  /** PDF template (classic) + per-field toggles; absent = defaults. */
  cvTemplate?: CvTemplateConfig;
  preferences: JobPreferences;
}
