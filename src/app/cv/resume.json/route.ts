import { candidateProfileRepository } from "@/app/_lib/container";
import { toJsonResume } from "@/domain/candidate/json-resume";

export const dynamic = "force-dynamic";

/**
 * The CV as JSON Resume data (public, like /cv — the shared URL is meant to be
 * consumed by themes, CLIs and ATS checks outside this app).
 */
export async function GET(): Promise<Response> {
  const profile = await candidateProfileRepository.findFirst();
  if (!profile) {
    return new Response("No CV on file yet.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(JSON.stringify(toJsonResume(profile), null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'inline; filename="resume.json"',
      "cache-control": "public, max-age=300",
    },
  });
}
