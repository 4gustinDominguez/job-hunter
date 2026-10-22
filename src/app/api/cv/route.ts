import { uploadedCvRepository } from "@/app/_lib/container";

export const dynamic = "force-dynamic";

function safeFilename(name: string): string {
  const ascii = name.replace(/[^\w.-]+/g, "_").slice(0, 120) || "cv.pdf";
  return ascii;
}

export async function GET(request: Request): Promise<Response> {
  const cv = await uploadedCvRepository.get();
  if (!cv) {
    return new Response("No CV on file. Import one from the profile page.", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const disposition = searchParams.has("download") ? "attachment" : "inline";
  const filename = safeFilename(cv.filename);

  return new Response(new Uint8Array(cv.content), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(cv.size),
      "content-disposition": `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(cv.filename)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
