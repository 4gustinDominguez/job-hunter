"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/search-profiles", label: "Search profiles" },
  { href: "/profile", label: "Profile" },
  { href: "/integrations", label: "Integrations" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="Main"
      className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-line bg-surface px-4 py-3 md:min-h-screen md:w-56 md:flex-col md:border-r md:border-b-0 md:px-4 md:py-6 print:hidden"
    >
      <p className="mr-4 hidden font-semibold md:mb-4 md:mr-0 md:block">Job Hunter</p>
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-accent-soft px-3 py-2 text-sm font-medium text-accent-strong"
                : "rounded-md px-3 py-2 text-sm text-muted hover:bg-paper hover:text-ink"
            }
          >
            {item.label}
          </Link>
        );
      })}
      <form action={logoutAction} className="md:mt-auto">
        <button
          type="submit"
          className="w-full rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-paper hover:text-ink md:text-left"
        >
          Logout
        </button>
      </form>
    </nav>
  );
}
