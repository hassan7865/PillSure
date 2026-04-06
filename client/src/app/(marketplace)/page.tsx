"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Star,
  Clock,
  Building2,
  ChevronRight,
  Stethoscope,
  Pill,
  ShieldCheck,
  Truck,
  HeartPulse,
  Quote,
  Thermometer,
  Activity,
  Sparkles,
  Droplets,
} from "lucide-react";
import Navbar from "@/app/components/Navbar";
import { MarketplaceHeroPillAnimation } from "@/components/marketplace/hero-pill-animation";
import { marketplaceApi, type PublicStoreSummary } from "@/lib/marketplace-api";
import { getErrorMessage } from "@/lib/error-utils";
import { Button } from "@/components/ui/button";
import { MarketplaceFooter } from "@/components/marketplace/chrome";
import { fixedNavbarOffsetPt, marketplaceContentWidthClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

const conditionCards = [
  {
    title: "Fever",
    hint: "Thermometers, antipyretics, hydration",
    query: "fever",
    Icon: Thermometer,
    bg: "from-primary/18 via-primary/8 to-transparent",
    chip: "bg-primary/12 text-primary dark:text-primary-foreground",
  },
  {
    title: "Pain relief",
    hint: "Headache, body pain, inflammation",
    query: "pain relief",
    Icon: Activity,
    bg: "from-primary/20 via-secondary/18 to-transparent",
    chip: "bg-primary/12 text-primary dark:text-primary-foreground",
  },
  {
    title: "Vitamins",
    hint: "Immunity and daily wellness",
    query: "vitamins",
    Icon: Sparkles,
    bg: "from-accent/22 via-primary/10 to-transparent",
    chip: "bg-primary/12 text-primary dark:text-primary-foreground",
  },
  {
    title: "Skin care",
    hint: "Acne, dryness, irritation support",
    query: "skin care",
    Icon: Droplets,
    bg: "from-secondary/25 via-primary/10 to-transparent",
    chip: "bg-primary/12 text-primary dark:text-primary-foreground",
  },
];

const testimonials = [
  {
    quote:
      "I can compare pharmacy prices in a minute and order from the one closest to me. Delivery has been smooth.",
    name: "Areeba M.",
    city: "Lahore",
  },
  {
    quote:
      "The marketplace flow is simple, and when needed I can quickly jump to doctor consult without leaving the app.",
    name: "Usman R.",
    city: "Karachi",
  },
  {
    quote:
      "Clean interface, clear stock visibility, and reliable updates. It feels made for real day-to-day medicine orders.",
    name: "Hina K.",
    city: "Islamabad",
  },
];

export default function DiscoverPage() {
  const router = useRouter();
  const [stores, setStores] = useState<PublicStoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [testimonialIndex, setTestimonialIndex] = useState(0);

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

  useEffect(() => {
    const t = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const visibleTestimonials = useMemo(() => {
    const a = testimonials[testimonialIndex % testimonials.length];
    const b = testimonials[(testimonialIndex + 1) % testimonials.length];
    return [a, b];
  }, [testimonialIndex]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Navbar />

      <div className={cn("flex-1", fixedNavbarOffsetPt)}>
        <main
          className={cn(marketplaceContentWidthClass(), "flex-1 pb-12 pt-3 sm:pt-4")}
        >
          <section className="relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-r from-primary to-primary/80">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/92 via-primary/80 to-primary/60" />
            <MarketplaceHeroPillAnimation />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-foreground/10 via-transparent to-transparent" />
            <div className="relative z-10 grid min-h-[240px] items-center gap-6 px-6 py-8 text-primary-foreground sm:min-h-[300px] sm:px-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:px-12 xl:min-h-[360px] xl:px-16">
              <div className="min-w-0">
                <span className="mb-4 inline-flex w-fit rounded-full bg-primary-foreground/15 px-4 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                  Your healthcare marketplace
                </span>
                <h1 className="mb-4 max-w-3xl break-words text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-6xl">
                  Find medicines from
                  <br />
                  nearby pharmacies.
                </h1>
                <p className="mb-6 max-w-xl text-base font-medium opacity-90 sm:text-lg lg:text-xl">
                  Compare listings, check availability, and consult doctors online whenever guidance is needed.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    onClick={() => router.push("/search")}
                    className="w-full min-h-11 rounded-full bg-primary-foreground px-6 py-6 text-primary shadow-lg hover:bg-primary-foreground/90 sm:w-auto"
                  >
                    <Pill className="mr-2 h-4 w-4" />
                    Find pharmacy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/search-doctor")}
                    className="w-full min-h-11 rounded-full border-primary-foreground/30 bg-primary-foreground/10 px-6 py-6 text-primary-foreground backdrop-blur-sm hover:bg-primary-foreground/20 sm:w-auto"
                  >
                    <Stethoscope className="mr-2 h-4 w-4" />
                    Consult doctor
                  </Button>
                </div>
              </div>

              <div className="hidden lg:grid lg:gap-3">
                <article className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4" />
                    Verified pharmacy network
                  </div>
                  <p className="mt-1 text-xs text-primary-foreground/85">
                    Browse trusted stores with active medicine listings.
                  </p>
                </article>
                <article className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Truck className="h-4 w-4" />
                    Fast local fulfilment
                  </div>
                  <p className="mt-1 text-xs text-primary-foreground/85">
                    Order from nearby pharmacies and get updates in real time.
                  </p>
                </article>
              </div>
            </div>
            <div className="absolute bottom-6 right-6 hidden gap-2 sm:flex">
              <span className="h-1.5 w-12 rounded-full bg-primary-foreground" />
              <span className="h-1.5 w-3 rounded-full bg-primary-foreground/40" />
              <span className="h-1.5 w-3 rounded-full bg-primary-foreground/40" />
            </div>
          </section>

          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {conditionCards.map((c) => (
              <button
                key={c.title}
                type="button"
                onClick={() => router.push(`/search?q=${encodeURIComponent(c.query)}`)}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br", c.bg)} />
                <div className="relative p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold", c.chip)}>
                      Common condition
                    </span>
                    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/80 backdrop-blur-sm">
                      <c.Icon className="h-5 w-5 text-foreground/80" />
                      <span className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary/70" />
                    </span>
                  </div>
                  <p className="text-base font-bold text-foreground">{c.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
                  <p className="mt-3 inline-flex items-center text-xs font-semibold text-primary">
                    Explore
                    <ChevronRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </p>
                </div>
              </button>
            ))}
          </section>

          <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <article className="flex h-56 flex-col justify-between rounded-2xl border border-border/70 bg-muted/20 p-5 lg:h-64">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Pharmacy-first shopping</p>
                <h3 className="mt-2 text-xl font-bold text-foreground">From pack view to checkout in one flow</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  See medicine packs clearly, compare nearby pharmacy options, and move to consultation only when you
                  need guidance. Built for practical, daily medicine buying.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Pill className="h-3.5 w-3.5 text-primary/80" />
                  Product clarity
                </span>
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-primary/80" />
                  Local delivery
                </span>
              </div>
            </article>
            <div className="relative h-56 overflow-hidden rounded-2xl border border-border/70 bg-muted/20 lg:h-64">
              <Image
                src="/image.png"
                alt=""
                fill
                className="object-cover object-right"
                sizes="(max-width: 1024px) 100vw, 58vw"
                priority
                unoptimized
              />
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
                {stores.map((s) => {
                  const hasOpening = s.openingTime && s.openingTime.trim() !== "" && s.openingTime.trim() !== "-";
                  const hasClosing = s.closingTime && s.closingTime.trim() !== "" && s.closingTime.trim() !== "-";
                  const operatingHours = hasOpening && hasClosing ? `${s.openingTime} - ${s.closingTime}` : "Hours not set";
                  return (
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
                          Trusted
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
                        <span className="text-sm font-bold">{operatingHours}</span>
                      </div>
                      <Button asChild className="w-full shrink-0 rounded-full px-6 font-bold sm:w-auto">
                        <Link href={`/pharmacy/${s.id}`} className="inline-flex items-center justify-center">
                          Visit store
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </article>
                  );
                })}
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

          <section className="mt-8 overflow-hidden rounded-[2rem] border border-border/80 bg-card p-6 sm:p-8 lg:p-10">
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="relative h-56 overflow-hidden rounded-2xl border border-border/70 bg-muted/20 lg:h-64">
                <Image
                  src="/Serene healthcare at home scene.png"
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  unoptimized
                />
              </div>
              <article className="flex h-56 flex-col justify-between rounded-2xl border border-border/70 bg-muted/20 p-5 lg:h-64">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">Patient-first care</p>
                  <h3 className="mt-2 text-xl font-bold text-foreground">Built for daily medicine needs</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    From nearby pharmacy discovery to doctor consultation, PillSure keeps the whole journey simple,
                    transparent, and reliable for families.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <HeartPulse className="h-3.5 w-3.5 text-primary/80" />
                    Trusted flow
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-primary/80" />
                    Fast delivery
                  </span>
                </div>
              </article>
            </div>
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">What patients say</p>
                <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">Real experiences on PillSure</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="hidden text-sm text-primary sm:inline-flex"
                onClick={() => router.push("/search")}
              >
                Browse marketplace
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {visibleTestimonials.map((t) => (
                <article
                  key={`${t.name}-${t.city}`}
                  className="rounded-2xl border border-border/70 bg-muted/20 p-5 transition-all duration-300"
                >
                  <Quote className="mb-3 h-5 w-5 text-primary/70" />
                  <p className="text-sm leading-relaxed text-foreground">"{t.quote}"</p>
                  <div className="mt-4 border-t border-border/60 pt-3">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.city}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTestimonialIndex(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === testimonialIndex ? "w-8 bg-primary" : "w-2 bg-primary/30 hover:bg-primary/50",
                  )}
                  aria-label={`Show testimonial ${i + 1}`}
                />
              ))}
            </div>
          </section>
        </main>
      </div>

      <MarketplaceFooter />
    </div>
  );
}
