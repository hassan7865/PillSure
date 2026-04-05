"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const MedicalStoreMapPickerInner = dynamic(
  () =>
    import("./medical-store-map-inner").then((m) => ({
      default: m.MedicalStoreMapPickerInner,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className={cn(
          "flex h-[min(360px,55vh)] items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground",
        )}
      >
        Loading map…
      </div>
    ),
  },
);

const MedicalStoreMapDisplayInner = dynamic(
  () =>
    import("./medical-store-map-inner").then((m) => ({
      default: m.MedicalStoreMapDisplayInner,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className={cn(
          "flex h-[min(360px,55vh)] items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground",
        )}
      >
        Loading map…
      </div>
    ),
  },
);

export function MedicalStoreMapPicker(props: {
  latitude: string;
  longitude: string;
  onPositionChange: (lat: number, lng: number) => void;
  className?: string;
}) {
  return <MedicalStoreMapPickerInner {...props} />;
}

export function MedicalStoreMapDisplay(props: {
  latitude: number;
  longitude: number;
  className?: string;
}) {
  return <MedicalStoreMapDisplayInner {...props} />;
}
