import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Next 16 proxy (ex-middleware). Self-contained by contract: the docs warn it
 * runs outside the app's module graph — no imports from src/app/_lib here,
 * only `jose`. Cookie name/verification must match src/app/_lib/auth.ts.
 *
 * This is the optimistic gate only; every server action additionally calls
 * requireSession() (server actions are POSTs that the matcher can miss).
 */
const SESSION_COOKIE = "session";

/** Paths reachable without a session. /api/cron authenticates via CRON_SECRET. */
const PUBLIC_PREFIXES = ["/login", "/api/cron"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function isAuthenticated(sessionToken: string | undefined): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!sessionToken || !secret) return false;
  try {
    await jwtVerify(sessionToken, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (await isAuthenticated(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const acceptsHtml = (request.headers.get("accept") ?? "").includes("text/html");
  if (!acceptsHtml && pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    /*
     * Run everywhere except static assets — including /api (so /api/cv is
     * protected; /api/cron opts out in code via CRON_SECRET instead).
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
