import { uploadedCvRepository } from "@/app/_lib/container";
import { pdfResponse } from "@/app/_lib/pdf-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const cv = await uploadedCvRepository.get();
  if (!cv) {
    return new Response("No CV on file. Import one from the profile page.", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  return pdfResponse(cv, { download: searchParams.has("download") });
}
