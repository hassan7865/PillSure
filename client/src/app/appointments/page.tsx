import { Suspense } from "react";
import AppointmentsPageClient from "./AppointmentsPageClient";

function AppointmentsFallback() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">Loading appointments…</p>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<AppointmentsFallback />}>
      <AppointmentsPageClient />
    </Suspense>
  );
}
