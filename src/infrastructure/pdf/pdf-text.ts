import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(pdf: Uint8Array): Promise<string> {
  // unpdf rejects Node Buffers even though they subclass Uint8Array — hand it a
  // real Uint8Array view over the same bytes.
  const bytes = Buffer.isBuffer(pdf)
    ? new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength)
    : pdf;
  const document = await getDocumentProxy(bytes);
  const { text } = await extractText(document, { mergePages: true });
  return text;
}
