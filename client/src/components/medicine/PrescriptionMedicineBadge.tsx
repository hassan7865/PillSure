import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type PrescriptionMedicineBadgeProps = {
  className?: string;
  /** Tighter padding and type for small product thumbnails */
  size?: "default" | "compact";
};

/**
 * Clearer than “Rx” alone: communicates that a doctor’s prescription is required.
 */
export function PrescriptionMedicineBadge({
  className,
  size = "default",
}: PrescriptionMedicineBadgeProps) {
  const compact = size === "compact";

  return (
    <div
      role="status"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 self-start rounded-md border border-primary/30 bg-primary/10 text-primary backdrop-blur-sm",
        compact
          ? "max-w-[9rem] px-1.5 py-0.5 shadow-none"
          : "max-w-[min(100%,11rem)] px-2 py-1 shadow-sm",
        className
      )}
      title="Requires a valid prescription from a licensed doctor"
    >
      <FileText
        className={cn("shrink-0", compact ? "h-2.5 w-2.5" : "h-3 w-3")}
        aria-hidden
      />
      <span
        className={cn(
          "min-w-0 truncate font-medium leading-none",
          compact ? "text-[10px] sm:text-[11px]" : "text-xs leading-tight"
        )}
      >
        Prescription
      </span>
    </div>
  );
}
