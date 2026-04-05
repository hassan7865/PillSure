"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, Clock, Building2, ChevronRight } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import { MarketplaceHeroPillAnimation } from "@/components/marketplace/hero-pill-animation";
import { marketplaceApi, type PublicStoreSummary } from "@/lib/marketplace-api";
import { getErrorMessage } from "@/lib/error-utils";
import { Button } from "@/components/ui/button";
import { MarketplaceFooter } from "@/components/marketplace/chrome";
import { fixedNavbarOffsetPt, marketplaceContentWidthClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

export default function DiscoverPage() {
  const router = useRouter();
  const [stores, setStores] = useState<PublicStoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await marketplaceApi.listStores({
        page: 1,
        limit: 24,
        q: debouncedSearch || undefined,
      });
      setStores(res.items);
    } catch (e) {
      setError(getErrorMessage(e));
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Navbar
        centerSearch={{
          value: search,
          onChange: setSearch,
          placeholder: "Search for medications, pharmacies, or health supplies…",
          onSubmit: () => {
            const q = search.trim();
            router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
          },
        }}
      />

      <div className={cn("flex-1", fixedNavbarOffsetPt)}>
        <main
          className={cn(marketplaceContentWidthClass(), "flex-1 pb-12 pt-3 sm:pt-4")}
        >
          <section className="relative mb-10 flex min-h-[240px] w-full flex-col justify-center overflow-hidden rounded-[2rem] bg-gradient-to-r from-primary to-primary/80 sm:min-h-[270px] lg:min-h-[300px] xl:min-h-[340px]">
            <MarketplaceHeroPillAnimation />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-foreground/10 via-transparent to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-center px-6 py-8 text-primary-foreground sm:px-10 lg:px-16">
              <span className="mb-4 w-fit rounded-full bg-primary-foreground/15 px-4 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                Summer health savings
              </span>
              <h1 className="mb-4 max-w-3xl break-words text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-6xl">
                Premium care,
                <br />
                delivered daily.
              </h1>
              <p className="mb-6 max-w-xl text-base font-medium opacity-90 sm:text-lg lg:text-xl">
                Free delivery on your first order of curated clinical supplies and prescription refills.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  onClick={() => router.push("/search")}
                  className="w-full min-h-11 rounded-full bg-primary-foreground px-6 py-6 text-primary shadow-lg hover:bg-primary-foreground/90 sm:w-auto"
                >
                  Explore brands
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/terms")}
                  className="w-full min-h-11 rounded-full border-primary-foreground/30 bg-primary-foreground/10 px-6 py-6 text-primary-foreground backdrop-blur-sm hover:bg-primary-foreground/20 sm:w-auto"
                >
                  Learn more
                </Button>
              </div>
            </div>
            <div className="absolute bottom-6 right-6 hidden gap-2 sm:flex">
              <span className="h-1.5 w-12 rounded-full bg-primary-foreground" />
              <span className="h-1.5 w-3 rounded-full bg-primary-foreground/40" />
              <span className="h-1.5 w-3 rounded-full bg-primary-foreground/40" />
            </div>
          </section>

          <section className="rounded-[2rem] bg-muted/40 p-6 sm:p-8 lg:p-12">
            {error && (
              <p className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            {loading && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-[2rem] bg-card p-6">
                    <div className="mb-6 h-20 rounded-2xl bg-muted" />
                    <div className="h-5 w-2/3 rounded bg-muted" />
                    <div className="mt-2 h-4 w-full rounded bg-muted" />
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && stores.length === 0 && (
              <p className="text-center text-muted-foreground">No pharmacies found yet. Check back soon.</p>
            )}

            {!loading && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {stores.map((s) => (
                  <article
                    key={s.id}
                    className="group relative flex min-w-0 flex-col rounded-[2rem] bg-card p-5 shadow-elevated transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated-lg sm:p-6"
                  >
                    <div className="mb-6 flex items-start justify-between gap-3">
                      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/50">
                        {s.logoUrl ? (
                          <Image
                            src={s.logoUrl}
                            alt={`${s.storeName} logo`}
                            fill
                            className="object-cover"
                            sizes="80px"
                            unoptimized
                          />
                        ) : (
                          <Building2 className="h-10 w-10 text-primary/60" />
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <span className="flex items-center gap-1 rounded-full bg-secondary/30 px-3 py-1 text-xs font-bold text-secondary-foreground dark:bg-secondary/20">
                          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                          —
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {s.city}
                        </span>
                      </div>
                    </div>
                    <div className="mb-6 flex-1">
                      <div className="mb-1 flex min-w-0 items-center gap-2">
                        <h3 className="min-w-0 flex-1 break-words text-lg font-bold text-foreground sm:text-xl">
                          {s.storeName}
                        </h3>
                        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />
                      </div>
                      <p className="mb-4 line-clamp-2 text-sm font-medium text-muted-foreground">
                        {s.addressLine}, {s.city}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {s.activeListingCount} listings
                        </span>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          Verified
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 border-t border-border/50 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-bold">—</span>
                      </div>
                      <Button asChild className="w-full shrink-0 rounded-full px-6 font-bold sm:w-auto">
                        <Link href={`/pharmacy/${s.id}`} className="inline-flex items-center justify-center">
                          Visit store
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!loading && stores.length > 0 && (
              <div className="mt-10 text-center lg:mt-12">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full max-w-md rounded-full border-2 px-8 py-6 text-base font-black tracking-tight sm:w-auto sm:px-10"
                  onClick={() =>
                    router.push(
                      search.trim()
                        ? `/search?q=${encodeURIComponent(search.trim())}`
                        : "/search",
                    )
                  }
                >
                  Load more pharmacies
                </Button>
              </div>
            )}
          </section>
        </main>
      </div>

      <MarketplaceFooter />
    </div>
  );
}
