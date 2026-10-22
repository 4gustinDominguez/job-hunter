export const DOCUMENT_KINDS = ["COVER_LETTER", "TAILORED_CV"] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export interface GeneratedDocument {
  id: string;
  applicationId: string;
  kind: DocumentKind;
  content: string;
  provider: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
}
