import type { PdfTextPort } from "@/application/ports/pdf-text-port";
import { extractPdfText } from "./pdf-text";

export class UnpdfTextExtractor implements PdfTextPort {
  async extract(pdf: Uint8Array): Promise<string> {
    return extractPdfText(pdf);
  }
}
