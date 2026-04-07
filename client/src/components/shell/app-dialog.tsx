import * as React from "react";

import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type DialogContentProps = React.ComponentProps<typeof DialogContent>;

const APP_DIALOG_SIZE: Record<
  "sm" | "md" | "lg" | "xl" | "full",
  string
> = {
  sm: "max-w-[calc(100%-2rem)] sm:max-w-sm",
  md: "max-w-[calc(100%-2rem)] sm:max-w-lg",
  lg: "max-w-[calc(100%-2rem)] sm:max-w-2xl",
  xl: "max-w-[calc(100%-2rem)] sm:max-w-4xl",
  full:
    "h-[min(92dvh,900px)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] sm:max-w-6xl",
};

export type AppDialogContentProps = DialogContentProps & {
  size?: keyof typeof APP_DIALOG_SIZE;
};
export function AppDialogContent({
  className,
  size = "md",
  children,
  ...props
}: AppDialogContentProps) {
  return (
    <DialogContent
      className={cn(
        APP_DIALOG_SIZE[size],
        "flex max-h-[min(92dvh,900px)] flex-col overflow-hidden overscroll-contain",
        className,
      )}
      {...props}
    >
      {children}
    </DialogContent>
  );
}
