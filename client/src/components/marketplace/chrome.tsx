"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, MapPin, Search, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const navLink = (active: boolean) =>
  cn(
    "border-b-2 pb-1 text-sm font-medium transition-colors",
    active
      ? "border-primary font-bold text-primary"
      : "border-transparent text-muted-foreground hover:text-foreground",
  );

export function MarketplaceNav({
  center,
  showMobileMenu = true,
}: {
  /** Desktop center area (e.g. search). Hidden below `lg` unless `showMobileMenu` duplicates it in-page. */
  center?: React.ReactNode;
  showMobileMenu?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || user.email[0]?.toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 shadow-sm shadow-foreground/5 backdrop-blur-xl">
      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8 lg:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-8">
          <Link href="/" className="shrink-0 text-xl font-black tracking-tighter text-primary sm:text-2xl">
            PillSure
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            <Link href="/" className={navLink(pathname === "/")}>
              Marketplace
            </Link>
            <Link href="/search-doctor" className={navLink(pathname.startsWith("/search-doctor"))}>
              Pharmacists
            </Link>
            <Link href="/orders" className={navLink(pathname.startsWith("/orders"))}>
              Orders
            </Link>
            <Link href="/terms" className={navLink(pathname === "/terms")}>
              Health plans
            </Link>
          </nav>
        </div>

        {center != null && (
          <div
            className={cn(
              "order-last w-full min-w-0 lg:order-none lg:flex lg:max-w-2xl lg:flex-1 lg:justify-center",
              !showMobileMenu && "hidden lg:flex",
            )}
          >
            {center}
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted sm:inline-flex"
            aria-label="Location"
          >
            <MapPin className="h-5 w-5" />
          </button>
          <Link
            href="/orders"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>
          <button type="button" className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted lg:inline-flex" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>
          <Link
            href="/orders"
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-muted text-xs font-semibold text-muted-foreground"
            aria-label="Account"
          >
            {initials}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Compact search used in nav (catalog page). */
export function NavSearchInput({
  value,
  onChange,
  placeholder = "Search medicines…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full max-w-xs md:max-w-sm lg:w-64 lg:max-w-none lg:transition-[width] lg:focus-within:w-80">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border-0 bg-muted py-2 pl-9 pr-3 text-sm outline-none ring-0 transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

export function MarketplaceFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/30 px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-w-0 max-w-7xl flex-col items-center justify-between gap-6 md:flex-row md:items-start">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground md:text-left">
          © {new Date().getFullYear()} PillSure. Pharmacy marketplace.
        </p>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          <Link href="/terms" className="text-xs font-medium uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="text-xs font-medium uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
            Privacy
          </Link>
          <Link href="/search" className="text-xs font-medium uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
            Browse medicines
          </Link>
        </div>
      </div>
    </footer>
  );
}
