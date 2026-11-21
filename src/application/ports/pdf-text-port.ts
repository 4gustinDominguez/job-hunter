export interface PdfTextPort {
  /** Full text of a PDF, or a best-effort extract when the file has a text layer. */
  extract(pdf: Uint8Array): Promise<string>;
}
