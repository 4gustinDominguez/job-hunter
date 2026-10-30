"use client";

import { useCallback, useState } from "react";
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

function NavItems({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
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
    </>
  );
}

function LogoutForm({ className }: { className?: string }) {
  return (
    <form action={logoutAction} className={className}>
      <button
        type="submit"
        className="w-full rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-paper hover:text-ink"
      >
        Logout
      </button>
    </form>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleOpen = useCallback(() => setOpen((value) => !value), []);
  const closeMenu = useCallback(() => setOpen(false), []);
  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="Main"
      className="shrink-0 border-b border-line bg-surface print:hidden md:min-h-screen md:w-56 md:border-r md:border-b-0"
    >
      {/* Mobile: brand + hamburger, with a collapsible panel (no scroll strip). */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold">Job Hunter</span>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={toggleOpen}
            className="rounded-md px-3 py-2 text-sm text-muted hover:bg-paper hover:text-ink"
          >
            <span aria-hidden="true">{open ? "✕" : "☰"}</span>
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
        {/* Always in the DOM so aria-controls resolves; toggled via hidden/flex. */}
        <div
          id="main-nav"
          className={`flex-col gap-1 border-t border-line px-2 py-2 ${open ? "flex" : "hidden"}`}
        >
          <NavItems pathname={pathname} onNavigate={closeMenu} />
          <LogoutForm className="pt-1" />
        </div>
      </div>

      {/* Desktop: static sidebar column (unchanged look). */}
      <div className="hidden flex-col md:flex md:min-h-screen md:px-4 md:py-6">
        <p className="mb-4 font-semibold">Job Hunter</p>
        <div className="flex flex-col gap-1">
          <NavItems pathname={pathname} />
        </div>
        <LogoutForm className="mt-auto pt-4" />
      </div>
    </nav>
  );
}
