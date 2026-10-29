import { NextResponse } from "next/server";
import { pool } from "@/app/_lib/container";

export const dynamic = "force-dynamic";

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

/**
 * Liveness probe for external uptime monitors (UptimeRobot/Sentry) and humans.
 * The happy path does no DB call — only `?deep=1` probes the database, so a
 * free-tier ping stays cheap. A dead DB is otherwise a separate failure: errors
 * surface via Sentry and the dashboard's unfinished-run flag. Unauthenticated
 * on purpose: no secrets in the payload, and monitors can't log in.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const base = { status: "ok" as const, version: VERSION, time: new Date().toISOString() };

  if (!searchParams.has("deep")) {
    return NextResponse.json(base);
  }

  try {
    await pool.query("select 1");
    return NextResponse.json({ ...base, database: "ok" });
  } catch {
    return NextResponse.json(
      { ...base, status: "error" as const, database: "unreachable" },
      { status: 503 },
    );
  }
}
