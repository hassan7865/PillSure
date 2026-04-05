import * as React from "react";

import { cn } from "@/lib/utils";

export const DASHBOARD_SCROLL_WORKSPACE_CLASS =
  "flex h-[calc(100dvh-7rem)] min-h-[320px] w-full flex-col gap-6";

export type DashboardScrollWorkspaceProps = {
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function DashboardScrollWorkspace({
  header,
  children,
  className,
  bodyClassName,
}: DashboardScrollWorkspaceProps) {
  return (
    <div className={cn(DASHBOARD_SCROLL_WORKSPACE_CLASS, className)}>
      <div className="shrink-0">{header}</div>
      <div className={cn("min-h-0 flex-1 overflow-hidden", bodyClassName)}>{children}</div>
    </div>
  );
}
