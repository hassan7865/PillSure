"use client";

import { Pill } from "lucide-react";
export function MarketplaceHeroPillAnimation() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]"
      aria-hidden
    >
      <div
        className="animate-marketplace-pill-a absolute -right-4 top-[8%] h-28 w-28 text-primary-foreground/30 sm:right-[6%] sm:h-36 sm:w-36"
        style={{ animationDelay: "0s" }}
      >
        <Pill className="h-full w-full drop-shadow-lg" strokeWidth={1.15} />
      </div>
      <div
        className="animate-marketplace-pill-b absolute right-[12%] top-[38%] h-16 w-16 text-primary-foreground/20 sm:right-[18%] sm:h-20 sm:w-20"
        style={{ animationDelay: "1.2s" }}
      >
        <Pill className="h-full w-full blur-[0.5px]" strokeWidth={1} />
      </div>
      <div
        className="animate-marketplace-pill-c absolute bottom-[12%] right-[8%] h-24 w-24 text-primary-foreground/25 sm:bottom-[15%] sm:right-[12%] sm:h-32 sm:w-32"
        style={{ animationDelay: "0.4s" }}
      >
        <Pill className="h-full w-full drop-shadow-lg" strokeWidth={1.2} />
      </div>
      <div
        className="animate-marketplace-pill-d absolute right-[38%] top-[18%] hidden h-14 w-14 text-primary-foreground/18 sm:block lg:right-[42%]"
        style={{ animationDelay: "2s" }}
      >
        <Pill className="h-full w-full" strokeWidth={1} />
      </div>
      <div className="absolute right-[20%] top-[52%] flex h-3 w-3 items-center justify-center sm:right-[28%]">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground/40 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-foreground ring-2 ring-primary-foreground/40" />
      </div>
    </div>
  );
}
