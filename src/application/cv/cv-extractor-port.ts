import type { SaveProfileInput } from "@/application/profile/save-profile";

export interface CvExtractOptions {
  filename?: string;
}

export interface CvExtractorPort {
  extract(pdf: Uint8Array, options?: CvExtractOptions): Promise<SaveProfileInput>;
}
