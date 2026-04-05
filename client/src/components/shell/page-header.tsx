import * as React from "react";

import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  variant?: "dashboard" | "hero";
  className?: string;
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  variant = "dashboard",
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
          {Icon && variant === "hero" ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20">
              <Icon className="h-5 w-5" />
            </span>
          ) : Icon ? (
            <Icon className="h-6 w-6 shrink-0 text-primary sm:h-7 sm:w-7" />
          ) : null}
          <span className="leading-tight">{title}</span>
        </h1>
        {description ? (
          <div className="max-w-3xl text-sm text-muted-foreground sm:text-[15px] [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline">
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
