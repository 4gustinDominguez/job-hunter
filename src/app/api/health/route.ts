import { NextResponse } from "next/server";

/**
 * Liveness endpoint (phase 11) for UptimeRobot-style pings: no DB call in the
 * happy path (a dead DB is a different failure — errors surface via Sentry
 * later and via the dashboard's unfinished-run flag now). Public on purpose.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    time: new Date().toISOString(),
  });
}
