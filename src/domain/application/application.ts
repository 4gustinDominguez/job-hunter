import type { ApplicationStatus } from "@/domain/application/enums";
import type { Contact } from "@/domain/application/contact";

export interface Application {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  appliedAt?: Date;
  cvVersion?: string;
  coverLetterVersion?: string;
  emailVersion?: string;
  contact?: Contact;
  notes?: string[];
  nextActionAt?: Date;
}
