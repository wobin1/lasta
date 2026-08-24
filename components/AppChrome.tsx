"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Role } from "@prisma/client";
import { logoutAction } from "@/app/actions/auth";
import { Toaster } from "@/components/Toaster";
import { can, homePath, isShopFloorRole, type Action, roleLabel } from "@/lib/permissions";
import { APP_INITIAL, APP_NAME } from "@/lib/brand";
import type { FlashToast } from "@/lib/flash-types";

type NavMode = "icon" | "full";
const NAV_KEY = "lasta-nav";

type NavItem = {
  href: string;
  label: string;
  action: Action;
  icon: "home" | "orders" | "people" | "box" | "stock" | "staff" | "board" | "tasks" | "finishing" | "qc" | "delivery" | "reports";
};

const deskItems: NavItem[] = [
  { href: "/dashboard", label: "Today", action: "dashboard.read", icon: "home" },
  { href: "/orders", label: "Orders", action: "orders.read", icon: "orders" },
  { href: "/customers", label: "Customers", action: "customers.read", icon: "people" },
  { href: "/products", label: "Products", action: "products.read", icon: "box" },
  { href: "/inventory", label: "Stock", action: "inventory.read", icon: "stock" },
  { href: "/production", label: "Board", action: "production.board", icon: "board" },
  { href: "/qc", label: "QC", action: "qc.read", icon: "qc" },
  { href: "/delivery", label: "Delivery", action: "delivery.read", icon: "delivery" },
  { href: "/reports", label: "Reports", action: "reports.read", icon: "reports" },
  { href: "/settings/users", label: "Staff", action: "users.write", icon: "staff" },
];

const floorItems: NavItem[] = [
  { href: "/production/me", label: "My tasks", action: "production.work", icon: "tasks" },
  { href: "/production/available", label: "Available", action: "production.work", icon: "board" },
  { href: "/finishing", label: "Finishing", action: "finishing.queue", icon: "finishing" },
];

const deliveryItems: NavItem[] = [
  { href: "/delivery", label: "Deliveries", action: "delivery.read", icon: "delivery" },
];

export function AppChrome({
  role,
  name,
  flash,
  unreadCount,
  children,
}: {
  role: Role;
  name?: string | null;
  flash?: FlashToast | null;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [mode, setMode] = useState<NavMode>("icon");
  const source = role === "DELIVERY" ? deliveryItems : isShopFloorRole(role) ? floorItems : deskItems;
  const visible = source.filter((item) => can(role, item.action));
  const settingsHref = can(role, "users.write")
    ? "/settings/users"
    : can(role, "templates.write")
      ? "/settings/templates"
      : homePath(role);
  const initials = (name ?? "S")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const expanded = mode === "full";

  useEffect(() => {
    const saved = window.localStorage.getItem(NAV_KEY);
    if (saved === "full" || saved === "icon") setMode(saved);
  }, []);

  function setNavMode(next: NavMode) {
    setMode(next);
    window.localStorage.setItem(NAV_KEY, next);
  }

  return (
    <div className="min-h-full px-5 py-5 md:px-8 md:py-6">
      <header className="mb-8 flex items-center justify-between bg-transparent">
        <Link
          href={homePath(role)}
          aria-label={`${APP_NAME} home`}
          className="flex items-center gap-3 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
        >
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--text)] text-sm font-semibold text-white"
          >
            {APP_INITIAL}
          </span>
          <span className="text-xl font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label={refreshing ? "Reloading this page" : "Reload this page"}
            aria-busy={refreshing}
            disabled={refreshing}
            onClick={() => startRefresh(() => router.refresh())}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)] disabled:opacity-70"
          >
            <RefreshIcon spinning={refreshing} />
          </button>
          <Link
            href={settingsHref}
            aria-label="Settings"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
          >
            <SettingsIcon />
          </Link>
          <Link
            href="/notifications"
            aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
          >
            <BellIcon />
            {unreadCount ? (
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[var(--warning)]" aria-hidden />
            ) : null}
          </Link>
          <div className="ml-2 flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-semibold shadow-[var(--shadow)]"
            >
              {initials}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold">{name}</span>
              <span className="block text-xs text-[var(--muted)]">{roleLabel[role]}</span>
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="min-h-11 rounded-full px-3 text-sm text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex items-start gap-6">
        <div className="sticky top-6 hidden shrink-0 flex-col items-center gap-3 self-start md:flex">
          <nav
            aria-label="Main"
            className={`flex flex-col gap-1.5 bg-[var(--surface)] py-4 shadow-[var(--shadow)] transition-[width] duration-[var(--motion)] ease-[var(--ease)] ${
              expanded
                ? "w-52 rounded-[28px] px-3"
                : "w-[4.25rem] items-center rounded-[32px] px-2"
            }`}
          >
            {visible.map((item) => {
              const active = navActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={`flex min-h-11 items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)] ${
                    expanded ? "gap-3 px-3" : "w-11 justify-center"
                  } ${
                    active
                      ? "bg-[var(--text)] text-white"
                      : "text-[var(--muted)] hover:bg-[var(--ground)] hover:text-[var(--text)]"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {expanded ? (
                    <span className="text-sm font-medium">{item.label}</span>
                  ) : (
                    <span className="sr-only">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div
            className="flex gap-1 rounded-full bg-[var(--surface)] p-1.5 shadow-[var(--shadow)]"
            role="group"
            aria-label="Navigation layout"
          >
            <button
              type="button"
              aria-pressed={mode === "icon"}
              aria-label="Icon view"
              onClick={() => setNavMode("icon")}
              className={`flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)] ${
                mode === "icon"
                  ? "bg-[var(--text)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--ground)]"
              }`}
            >
              <IconViewGlyph />
            </button>
            <button
              type="button"
              aria-pressed={mode === "full"}
              aria-label="Full view with names"
              onClick={() => setNavMode("full")}
              className={`flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)] ${
                mode === "full"
                  ? "bg-[var(--text)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--ground)]"
              }`}
            >
              <FullViewGlyph />
            </button>
          </div>
        </div>

        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-4 bottom-4 z-20 flex justify-around rounded-full bg-[var(--surface)] px-2 py-2 shadow-[var(--shadow)] md:hidden"
      >
        {visible.map((item) => {
          const active = navActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${
                active ? "bg-[var(--text)] text-white" : "text-[var(--muted)]"
              }`}
            >
              <span className="sr-only">{item.label}</span>
              <NavIcon name={item.icon} />
            </Link>
          );
        })}
      </nav>
      <Toaster flash={flash} />
    </div>
  );
}

function navActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/production") {
    return (
      pathname.startsWith("/production/") &&
      !pathname.startsWith("/production/me") &&
      !pathname.startsWith("/production/available")
    );
  }
  return pathname.startsWith(`${href}/`);
}

function NavIcon({ name }: { name: NavItem["icon"] }) {
  const common = "h-5 w-5 shrink-0";
  if (name === "home") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "orders") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 3.5h10a2 2 0 0 1 2 2V20l-3.5-2-3.5 2-3.5-2L5 20V5.5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "people") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 19a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M20.5 19a4 4 0 0 0-5-3.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "box") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 8.5 12 4l8 4.5v9L12 22 4 17.5v-9Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 22V13M4 8.5 12 13l8-4.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === "stock") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M8 8V6.5A4 4 0 0 1 12 2.5 4 4 0 0 1 16 6.5V8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 13h16" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === "board") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "tasks") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 12.5 9 16.5 19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "finishing") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 4 13.8 9.2 19 11 13.8 12.8 12 18 10.2 12.8 5 11 10.2 9.2 12 4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "qc") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 11.2 10.6 13l3.6-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.5 16.5 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "delivery") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 7h11v10H3V7Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14 10h4l3 3v4h-7v-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="7" cy="18.5" r="1.7" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="18.5" r="1.7" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === "reports") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 19V9M10 19V5M15 19v-7M20 19V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${spinning ? "animate-spin" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M20 12a8 8 0 1 1-2.2-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20 5v5h-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5v2.2M12 18.3V20.5M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12H20.5M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconViewGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function FullViewGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4" cy="6" r="1.2" fill="currentColor" />
      <circle cx="4" cy="12" r="1.2" fill="currentColor" />
      <circle cx="4" cy="18" r="1.2" fill="currentColor" />
    </svg>
  );
}
