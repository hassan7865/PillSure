import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { cardSectionClass } from "@/lib/dashboard-ui";

import { InlineError } from "./inline-error";

export type ListingPanelProps = {
  className?: string;
  cardClassName?: string;
listTitle?: React.ReactNode;
listDescription?: React.ReactNode;
toolbarEnd?: React.ReactNode;
header?: React.ReactNode;
children: React.ReactNode;
footer?: React.ReactNode;
isLoading?: boolean;
  loadingTitle?: string;
  loadingDescription?: string;
error?: Error | string | null;
  onRetry?: () => void;
isEmpty?: boolean;
  empty?: React.ReactNode;
};

export function ListingPanel({
  className,
  cardClassName,
  listTitle,
  listDescription,
  toolbarEnd,
  header,
  children,
  footer,
  isLoading,
  loadingTitle = "Loading",
  loadingDescription = "Fetching data…",
  error,
  onRetry,
  isEmpty,
  empty,
}: ListingPanelProps) {
  const showContent = Boolean(!isLoading && !error && isEmpty !== true);

  return (
    <Card
      className={cn(
        cardSectionClass(),
        "flex h-full min-h-0 flex-col overflow-hidden",
        cardClassName,
        className,
      )}
    >
      {header ? (
        header
      ) : (
        <CardHeader className="shrink-0 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {listTitle ? <CardTitle className="text-lg sm:text-xl">{listTitle}</CardTitle> : null}
              {listDescription ? (
                <CardDescription className="text-xs sm:text-sm">{listDescription}</CardDescription>
              ) : null}
            </div>
            {toolbarEnd ? <div className="w-full shrink-0 sm:w-auto">{toolbarEnd}</div> : null}
          </div>
        </CardHeader>
      )}
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
        {isLoading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center py-8">
            <Loader title={loadingTitle} description={loadingDescription} />
          </div>
        ) : error ? (
          <InlineError
            message={typeof error === "string" ? error : error.message}
            onRetry={onRetry}
          />
        ) : isEmpty === true ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">{empty}</div>
        ) : showContent ? (
          <>
            <div className="-mx-4 min-h-0 flex-1 overflow-auto sm:mx-0">{children}</div>
            {footer ? <div className="mt-4 shrink-0">{footer}</div> : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
