import { Suspense } from "react";
import OrdersPageClient from "./OrdersPageClient";

function OrdersFallback() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">Loading orders…</p>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersFallback />}>
      <OrdersPageClient />
    </Suspense>
  );
}
