"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

/**
 * Paths rendered WITHOUT the app shell (no sidebar, no <main> padding) — pages
 * meant to stand alone, e.g. the shareable public /cv. Everything else gets the
 * authenticated dashboard chrome. Lives in a client component so it can read the
 * pathname; `children` stay server-rendered.
 */
const STANDALONE_PREFIXES = ["/cv"];

function isStandalone(pathname: string): boolean {
  return STANDALONE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Standalone pages render bare inside <body> — no menu, no main padding.
  if (isStandalone(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
