export interface PdfFile {
  filename: string;
  content: Buffer;
  size: number;
}

/**
 * Serve the uploaded CV PDF as a response. Shared by the authenticated
 * /api/cv (dashboard) and the public /cv/pdf (shared CV page) so the header
 * construction lives in one place.
 */
export function pdfResponse(
  file: PdfFile,
  {
    download = false,
    cacheControl = "private, no-store",
  }: { download?: boolean; cacheControl?: string },
): Response {
  const ascii = file.filename.replace(/[^\w.-]+/g, "_").slice(0, 120) || "cv.pdf";
  const disposition = download ? "attachment" : "inline";

  return new Response(new Uint8Array(file.content), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(file.size),
      "content-disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff",
    },
  });
}
