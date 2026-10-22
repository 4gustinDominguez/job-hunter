export interface UploadedCv {
  filename: string;
  content: Buffer;
  size: number;
  uploadedAt: Date;
}

/** Single-row store for the CV file on record (mirrors the one-profile invariant). */
export interface UploadedCvRepositoryPort {
  get(): Promise<UploadedCv | null>;
  save(file: { filename: string; content: Buffer }): Promise<UploadedCv>;
}
