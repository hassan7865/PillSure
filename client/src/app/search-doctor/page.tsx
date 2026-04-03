import { Suspense } from "react";
import SearchDoctorPageClient from "./SearchDoctorPageClient";

function FindDoctorFallback() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">Loading find doctors…</p>
    </div>
  );
}

export default function FindDoctorPage() {
  return (
    <Suspense fallback={<FindDoctorFallback />}>
      <SearchDoctorPageClient />
    </Suspense>
  );
}
