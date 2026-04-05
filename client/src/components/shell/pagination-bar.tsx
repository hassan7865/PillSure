import * as React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationBarProps = {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
  disabled?: boolean;
  summary?: React.ReactNode;
  className?: string;
};

export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  disabled,
  summary,
  className,
}: PaginationBarProps) {
  if (totalPages <= 1 && !summary) return null;

  return (
    <div className={cn(totalPages > 1 || summary ? "space-y-4" : "", className)}>
      {totalPages > 1 ? <Separator /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {summary ? (
          <div className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">{summary}</div>
        ) : (
          <div />
        )}
        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <span className="px-2 text-xs text-muted-foreground tabular-nums sm:text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
