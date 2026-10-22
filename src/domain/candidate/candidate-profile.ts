import type { Education } from "@/domain/candidate/education";
import type { Experience } from "@/domain/candidate/experience";
import type { Project } from "@/domain/candidate/project";
import type { Skill } from "@/domain/candidate/skill";
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
  preferences: JobPreferences;
}
