"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pill, ChevronRight, MapPin, Store } from "lucide-react";
import { marketplaceApi, type MarketplaceListingHit } from "@/lib/marketplace-api";
import { getErrorMessage } from "@/lib/error-utils";
import { formatRetailPriceLine } from "@/lib/format-money";
import { MedicineRxStamp } from "@/components/medicine/medicine-catalog-parts";
import { Button } from "@/components/ui/button";
import Loader from "@/components/ui/loader";
import Navbar from "@/app/components/Navbar";
import { MarketplaceFooter } from "@/components/marketplace/chrome";
import {
  fixedNavbarOffsetPt,
  fixedNavbarScrollPt,
  marketplaceContentWidthClass,
  surfaceListItemClass,
} from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 350;

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") || "";

  const [input, setInput] = useState(qParam);
  const [debounced, setDebounced] = useState(qParam);
  const [loading, setLoading] = useState(false);
  const [medResults, setMedResults] = useState<MarketplaceListingHit[]>([]);
  /** Total matching listings (may exceed `medResults` when limited to first page). */
  const [listingsTotal, setListingsTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInput(qParam);
    setDebounced(qParam);
  }, [qParam]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (debounced) sp.set("q", debounced);
    const next = sp.toString();
    const cur = searchParams.toString();
    if (next !== cur) {
      router.replace(next ? `/search?${next}` : "/search", { scroll: false });
    }
  }, [debounced, router, searchParams]);

  const runSearch = useCallback(async () => {
    const q = debounced.trim();
    if (!q) {
      setMedResults([]);
      setListingsTotal(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const med = await marketplaceApi.searchListings({ q, page: 1, limit: 24 });
      setMedResults(med.items);
      setListingsTotal(typeof med.total === "number" ? med.total : med.items.length);
    } catch (e) {
      setError(getErrorMessage(e));
      setMedResults([]);
      setListingsTotal(null);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const hasQuery = debounced.trim().length > 0;
  const queryLabel = debounced.trim();
  const shownCount = medResults.length;
  const totalCount = listingsTotal ?? shownCount;
  const hasMoreThanShown = totalCount > shownCount;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Navbar
        centerSearch={{
          value: input,
          onChange: setInput,
          placeholder: "Search medicines by name…",
        }}
      />

      <main
        className={cn(
          marketplaceContentWidthClass(),
          fixedNavbarOffsetPt,
          fixedNavbarScrollPt,
          "flex-1 pb-8 lg:pb-12",
        )}
      >
        <div className="mx-auto w-full max-w-6xl">
          {!hasQuery ? (
            <div className="mb-10 lg:mb-12">
              <div className="mb-4 flex min-w-0 items-center justify-center gap-2 lg:justify-start">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="shrink-0 rounded-full p-2 text-foreground hover:bg-muted lg:hidden"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="min-w-0 break-words text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-left lg:text-4xl">
                  Find your medication.
                </h1>
              </div>
              <p className="mx-auto max-w-2xl text-pretty text-sm text-muted-foreground lg:mx-0">
                Type a medicine name in the bar above. When you search, you&apos;ll see listings from pharmacies with
                price and store.
              </p>
            </div>
          ) : (
            <header className="mb-8 border-b border-border/70 pb-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Search results</p>
                  <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    <span className="text-muted-foreground">&ldquo;</span>
                    {queryLabel}
                    <span className="text-muted-foreground">&rdquo;</span>
                  </h1>
                  {loading ? (
                    <p className="mt-2 text-sm text-muted-foreground">Searching listings…</p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {totalCount === 0
                        ? "No pharmacy listings match this search."
                        : `${totalCount} ${totalCount === 1 ? "listing" : "listings"} found${hasMoreThanShown ? ` · showing first ${shownCount}` : ""}`}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInput("");
                    setDebounced("");
                  }}
                  className="shrink-0 self-start rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Clear search
                </button>
              </div>
            </header>
          )}

        {error && (
          <p className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && hasQuery && (
          <div className="mb-6 space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border/50 bg-muted/20 p-4 sm:p-5"
              >
                <div className="flex gap-4 sm:gap-5">
                  <div className="h-20 w-20 shrink-0 rounded-xl bg-muted sm:h-24 sm:w-24" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="h-5 w-3/4 max-w-md rounded bg-muted" />
                    <div className="h-4 w-40 rounded bg-muted" />
                    <div className="h-6 w-28 rounded bg-muted mt-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasQuery && !loading && (
          <div className="space-y-3">
            {medResults.map((row) => (
              <Link
                key={row.listingId}
                href={`/medicine/${row.medicineId}?${new URLSearchParams({ storeId: row.medicalStoreId, listingId: row.listingId }).toString()}`}
                className={cn(
                  surfaceListItemClass(
                    "group flex gap-4 p-4 transition-all hover:border-primary/25 hover:shadow-md sm:gap-5 sm:p-5",
                  ),
                )}
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-[5.5rem] sm:w-[5.5rem]">
                  {row.displayImageUrl ? (
                    <Image src={row.displayImageUrl} alt="" fill className="object-cover" sizes="88px" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Pill className="h-9 w-9 text-muted-foreground/35" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground group-hover:text-primary sm:text-lg">
                      {row.medicineName}
                    </h2>
                    {row.prescriptionRequired ? (
                      <MedicineRxStamp className="shrink-0 rounded-full px-2 py-0.5" />
                    ) : null}
                  </div>
                  {row.manufacturerName ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{row.manufacturerName}</p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Store className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">{row.storeName}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-3">
                    <span className="text-lg font-bold tabular-nums text-foreground">
                      {formatRetailPriceLine(row.currency, row.retailPrice)}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-medium text-primary">
                      View Details
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {medResults.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                <p className="text-sm font-medium text-foreground">No listings match &ldquo;{queryLabel}&rdquo;</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try another name, or browse stores from the home page.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Map callout */}
        <div className="mt-16 flex flex-col items-stretch gap-8 rounded-[2rem] bg-muted/40 p-6 sm:rounded-[2.5rem] sm:p-8 lg:mt-20 lg:flex-row lg:items-center lg:p-12">
          <div className="min-w-0 flex-1 text-center lg:text-left">
            <h2 className="mb-3 break-words text-xl font-black tracking-tight text-foreground sm:text-2xl lg:text-3xl">
              Can&apos;t find it? Explore nearby pharmacies.
            </h2>
            <p className="text-muted-foreground lg:max-w-md lg:text-lg">
              Filter by distance and opening hours. Browse verified medical stores on the marketplace.
            </p>
            <Button
              type="button"
              className="mt-6 w-full max-w-xs rounded-full px-8 py-6 font-bold sm:w-auto"
              onClick={() => router.push("/")}
            >
              <MapPin className="mr-2 h-4 w-4" />
              Back to discover
            </Button>
          </div>
          <div className="relative h-48 min-h-[12rem] w-full max-w-lg overflow-hidden rounded-2xl bg-muted sm:h-56 lg:h-72 lg:max-w-none lg:flex-1 lg:rounded-[2rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-card px-6 py-3 text-sm font-bold shadow-lg">Map view soon</span>
            </div>
          </div>
        </div>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader title="Loading" description="Opening search…" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
