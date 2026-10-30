import { uploadedCvRepository } from "@/app/_lib/container";
import { pdfResponse } from "@/app/_lib/pdf-response";

export const dynamic = "force-dynamic";

/**
 * Public PDF endpoint backing the shared /cv page (its iframe + links). Public
 * on purpose — a CV page is meant to be shared — so it is NOT behind the auth
 * proxy. Short public cache; the file only changes when re-imported.
 */
export async function GET(request: Request): Promise<Response> {
  const cv = await uploadedCvRepository.get();
  if (!cv) {
    return new Response("No CV on file yet.", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  return pdfResponse(cv, {
    download: searchParams.has("download"),
    cacheControl: "public, max-age=300",
  });
}
