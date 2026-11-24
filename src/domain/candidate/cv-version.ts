import type { CvLayout } from "@/domain/candidate/cv-layout";
import type { CvTemplateConfig } from "@/domain/candidate/cv-template";
import type { ProfileLink } from "@/domain/candidate/profile-links";
import type { Education } from "@/domain/candidate/education";
import type { Experience } from "@/domain/candidate/experience";
import type { Project } from "@/domain/candidate/project";
import type { Skill } from "@/domain/candidate/skill";
import type { Location } from "@/domain/shared/location";

/**
 * Frozen copy of everything the public CV renders — taken when a version is
 * saved, restored as a whole when a version is loaded. Preferences are
 * deliberately excluded: they drive the job search, not the CV.
 */
export interface CvSnapshot {
  name: string;
  email: string;
  phone?: string;
  location?: Location;
  summary?: string;
  skills: Skill[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  links?: ProfileLink[];
  cvLayout?: CvLayout;
  cvTemplate?: CvTemplateConfig;
}

export interface CvVersion {
  id: string;
  profileId: string;
  label: string;
  snapshot: CvSnapshot;
  createdAt: Date;
}
