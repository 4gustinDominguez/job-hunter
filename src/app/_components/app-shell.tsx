"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

/**
 * Paths rendered WITHOUT the app shell (no sidebar, no <main> padding) — only
 * the public shareable /cv page itself. Everything else (including /cv/builder,
 * a private editing surface) gets the authenticated dashboard chrome. Lives in
 * a client component so it can read the pathname; `children` stay
 * server-rendered.
 */
function isStandalone(pathname: string): boolean {
  return pathname === "/cv" || pathname === "/cv/";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Standalone pages render bare inside <body> — no menu, no main padding.
  if (isStandalone(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row print:min-h-0">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10 print:p-0">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
