import { cn } from "@/lib/utils";

/** Tier-2 nested list / row surface (inside a Card or page section). */
export function surfaceListItemClass(className?: string) {
  return cn(
    "rounded-2xl border border-border/80 bg-card shadow-sm transition-colors hover:border-primary/20",
    className,
  );
}

/** Muted inset panel (shipping block, stat mini-card). */
export function surfaceInsetClass(className?: string) {
  return cn("rounded-xl border border-border/50 bg-muted/15", className);
}

/** Primary section Card — matches marketing emphasis used on key dashboard pages. */
export function cardSectionClass(className?: string) {
  return cn("border-primary/10 shadow-sm", className);
}

/** Patient-facing pages (orders, etc.) under public layout: consistent width + padding. */
export function publicPageContainerClass(className?: string) {
  return cn("mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:max-w-5xl", className);
}

/** Wide patient flows (split layouts): matches dashboard `PageShell` max width. */
export function publicWidePageClass(className?: string) {
  return cn("mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8", className);
}

/** Marketplace main column — same horizontal scale as `PageShell` / dashboard. */
export function marketplaceContentWidthClass(className?: string) {
  return cn("mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6 lg:px-8", className);
}

/** Max width only (no horizontal padding) — for regions that already apply padding (e.g. hero overlays). */
export function marketplaceMaxWidthClass(className?: string) {
  return cn("mx-auto w-full min-w-0 max-w-7xl", className);
}

/**
 * Dynamic navbar offsets.
 * Populated from `Navbar` via `--app-navbar-height`.
 */
export const fixedNavbarOffsetPt = "app-navbar-offset";
export const fixedNavbarScrollPt = "app-navbar-scroll-offset";
