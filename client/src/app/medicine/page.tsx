import { Suspense } from "react";
import MedicineCatalogClient from "./MedicineCatalogClient";

function MedicineCatalogFallback() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">Loading catalog…</p>
    </div>
  );
}

export default function MedicinePage() {
  return (
    <Suspense fallback={<MedicineCatalogFallback />}>
      <MedicineCatalogClient />
    </Suspense>
  );
}
