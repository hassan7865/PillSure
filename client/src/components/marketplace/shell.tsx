"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Compass, Building2, Pill, User } from "lucide-react";
import Loader from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { usePublicAreaGate } from "@/hooks/use-public-area-gate";

function MarketplaceBottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  const discover = pathname === "/";
  const pharmacy = pathname === "/search" && tab === "pharmacies";
  const medicine = pathname === "/search" && tab !== "pharmacies";
  const profile = pathname === "/orders";

  const item = (active: boolean) =>
    cn(
      "flex flex-col items-center justify-center rounded-2xl px-4 py-2 text-[11px] font-medium uppercase tracking-wider transition-all",
      active
        ? "scale-105 bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-primary",
    );

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full justify-around border-t border-border bg-background/90 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-3 lg:hidden">
      <Link href="/" className={item(discover)} aria-current={discover ? "page" : undefined}>
        <Compass className="h-6 w-6" strokeWidth={discover ? 2.25 : 2} />
        <span className="mt-1">Discover</span>
      </Link>
      <Link
        href="/search?tab=pharmacies"
        className={item(pharmacy)}
        aria-current={pharmacy ? "page" : undefined}
      >
        <Building2 className="h-6 w-6" strokeWidth={pharmacy ? 2.25 : 2} />
        <span className="mt-1">Pharmacy</span>
      </Link>
      <Link
        href="/search?tab=medicines"
        className={item(medicine)}
        aria-current={medicine ? "page" : undefined}
      >
        <Pill className="h-6 w-6" strokeWidth={medicine ? 2.25 : 2} />
        <span className="mt-1">Medicine</span>
      </Link>
      <Link href="/orders" className={item(profile)} aria-current={profile ? "page" : undefined}>
        <User className="h-6 w-6" strokeWidth={profile ? 2.25 : 2} />
        <span className="mt-1">Profile</span>
      </Link>
    </nav>
  );
}
function MarketplaceBottomNav() {
  return (
    <Suspense
      fallback={
        <nav
          className="fixed bottom-0 left-0 z-50 flex h-[4.25rem] w-full items-center justify-around border-t border-border bg-background/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden"
          aria-hidden
        />
      }
    >
      <MarketplaceBottomNavInner />
    </Suspense>
  );
}

export function MarketplaceClientLayout({ children }: { children: React.ReactNode }) {
  const { loading, redirecting } = usePublicAreaGate();

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader title="Loading" description="Preparing marketplace…" />
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader title="Redirecting" description="Opening your dashboard…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground pb-24 lg:pb-6">
      {children}
      <MarketplaceBottomNav />
    </div>
  );
}
