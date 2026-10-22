import { NextResponse } from "next/server";
import { analyzePendingJobs, ingestJobs, prefilterJobs } from "@/app/_lib/container";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ingest = await ingestJobs.run({ keywords: [] });
  const prefilter = await prefilterJobs.run();
  const analysis = await analyzePendingJobs.run();
  return NextResponse.json({ ingest, prefilter, analysis });
}
