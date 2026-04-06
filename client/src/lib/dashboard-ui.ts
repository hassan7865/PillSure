import { cn } from "@/lib/utils";
export function surfaceListItemClass(className?: string) {
  return cn(
    "rounded-2xl border border-border/80 bg-card shadow-sm transition-colors hover:border-primary/20",
    className,
  );
}
export function surfaceInsetClass(className?: string) {
  return cn("rounded-xl border border-border/50 bg-muted/15", className);
}
export function cardSectionClass(className?: string) {
  return cn("border-primary/10 shadow-sm", className);
}
export function publicPageContainerClass(className?: string) {
  return cn("mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:max-w-5xl", className);
}
export function publicWidePageClass(className?: string) {
  return cn("mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8", className);
}
export function marketplaceContentWidthClass(className?: string) {
  return cn("mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6 lg:px-8", className);
}
export function marketplaceMaxWidthClass(className?: string) {
  return cn("mx-auto w-full min-w-0 max-w-7xl", className);
}
export const fixedNavbarOffsetPt = "app-navbar-offset";
export const fixedNavbarScrollPt = "app-navbar-scroll-offset";
