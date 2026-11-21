import { ValidationError } from "@/application/errors";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { PdfTextPort } from "@/application/ports/pdf-text-port";
import type { UploadedCvRepositoryPort } from "@/application/ports/uploaded-cv-repository-port";
import type { AtsCheck, AtsReport } from "@/domain/ats/ats-report";
import { checkPdfReadability, scoreResume, summarizeAts } from "@/domain/ats/score-ats";
import { toJsonResume } from "@/domain/candidate/json-resume";

export class RunAtsCheck {
  constructor(
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly uploadedCvs: UploadedCvRepositoryPort,
    private readonly pdfText: PdfTextPort,
  ) {}

  async run(): Promise<AtsReport> {
    const profile = await this.profiles.findFirst();
    if (!profile) {
      throw new ValidationError("profile", "No profile to check yet — save one first.");
    }

    const checks: AtsCheck[] = scoreResume(toJsonResume(profile));

    const cv = await this.uploadedCvs.get();
    let text = "";
    if (cv) {
      text = await this.pdfText.extract(cv.content).catch(() => "");
    }
    checks.push(checkPdfReadability(text, cv !== null));

    return summarizeAts(checks);
  }
}
