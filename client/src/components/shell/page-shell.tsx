import * as React from "react";

import { cn } from "@/lib/utils";

export type PageShellProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "wide";
};

export function PageShell({ children, className, variant = "default" }: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full py-6",
        variant === "default" && "max-w-7xl px-4 sm:px-6 lg:px-8",
        variant === "wide" && "max-w-[min(100%,96rem)] px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
