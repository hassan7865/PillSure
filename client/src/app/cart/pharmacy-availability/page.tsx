"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PublicLayout from "@/layout/PublicLayout";
import cartApi, {
  type PharmacyAvailabilityResponse,
  type PharmacyAvailabilitySort,
  type PharmacyAvailabilityStore,
} from "@/app/cart/_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Pill, Store, CircleCheck, AlertTriangle, ShoppingCart, ChevronRight, MapPin, Clock, CircleOff } from "lucide-react";

function formatMoney(currency: string, value: number) {
  return `${currency} ${Number(value || 0).toFixed(2)}`;
}

export default function PharmacyAvailabilityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError, showSuccess, showInfo } = useCustomToast();
  const [loading, setLoading] = useState(true);
  const [syncingStoreId, setSyncingStoreId] = useState<string | null>(null);
  const [detailsStoreId, setDetailsStoreId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<PharmacyAvailabilitySort>("availability");
  const [data, setData] = useState<PharmacyAvailabilityResponse | null>(null);
  const [qtyByKey, setQtyByKey] = useState<Record<string, number>>({});
  const appointmentId = searchParams.get("appointmentId")?.trim() || "";
  const isPrescriptionFlow = Boolean(appointmentId);

  const load = useCallback(async (nextSort: PharmacyAvailabilitySort) => {
    try {
      setLoading(true);
      const result = isPrescriptionFlow
        ? await cartApi.getPrescriptionPharmacyAvailability(appointmentId, nextSort)
        : await cartApi.getPharmacyAvailability(nextSort);
      setData(result);
      const initial: Record<string, number> = {};
      for (const store of result.stores) {
        for (const line of store.items) {
          const key = `${store.medicalStoreId}:${line.cartItemId}`;
          initial[key] =
            line.availableQuantity > 0
              ? Math.min(line.requestedQuantity, line.availableQuantity)
              : line.requestedQuantity;
        }
      }
      setQtyByKey(initial);
    } catch (error) {
      showError("Failed to load availability", getErrorMessage(error));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, isPrescriptionFlow, showError]);

  useEffect(() => {
    load(sortBy);
  }, [load, sortBy]);

  const totalRequestedItems = useMemo(() => data?.requestedItems.length ?? 0, [data?.requestedItems.length]);
  const detailsStore = useMemo(
    () => data?.stores.find((store) => store.medicalStoreId === detailsStoreId) ?? null,
    [data?.stores, detailsStoreId],
  );

  const getCoveragePercent = useCallback(
    (store: PharmacyAvailabilityStore) => {
      if (!totalRequestedItems) return 0;
      return Math.round((store.availableItemsCount / totalRequestedItems) * 100);
    },
    [totalRequestedItems],
  );

  const handleQtyChange = (store: PharmacyAvailabilityStore, cartItemId: string, nextRaw: string, max: number) => {
    const parsed = Number(nextRaw);
    if (!Number.isFinite(parsed)) return;
    const nextQty = Math.max(1, Math.floor(parsed));
    if (nextQty > max) {
      showInfo("Stock limit", `Only ${max} units are available for this medicine at this pharmacy.`);
    }
    const key = `${store.medicalStoreId}:${cartItemId}`;
    setQtyByKey((prev) => ({
      ...prev,
      [key]: Math.min(nextQty, max),
    }));
  };

  const handleUsePharmacy = async (store: PharmacyAvailabilityStore) => {
    const availableLines = store.items.filter((line) => line.availableQuantity > 0);
    if (!availableLines.length) {
      showInfo("No stock", "This pharmacy has no available medicines from your cart.");
      return;
    }

    const selections = availableLines.map((line) => {
      const key = `${store.medicalStoreId}:${line.cartItemId}`;
      const chosen = qtyByKey[key] ?? Math.min(line.requestedQuantity, line.availableQuantity);
      return {
        cartItemId: line.cartItemId,
        quantity: Math.max(1, Math.min(chosen, line.availableQuantity)),
      };
    });

    try {
      setSyncingStoreId(store.medicalStoreId);
      const result = isPrescriptionFlow
        ? await cartApi.applyPrescriptionPharmacySelection({
            appointmentId,
            medicalStoreId: store.medicalStoreId,
            selections,
          })
        : await cartApi.applyPharmacySelection({
            medicalStoreId: store.medicalStoreId,
            selections,
          });
      const removedCount = Array.isArray(result?.removedItems) ? result.removedItems.length : 0;
      showSuccess(
        "Cart updated",
        removedCount > 0
          ? `Added available items from ${store.storeName}. ${removedCount} unavailable item(s) were removed.`
          : `Added available items from ${store.storeName}.`,
      );
      router.push(isPrescriptionFlow ? "/cart" : "/");
    } catch (error) {
      showError("Could not update cart", getErrorMessage(error));
    } finally {
      setSyncingStoreId(null);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-[#f7f9fb] to-[#eef3f7] pb-20">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-['Manrope'] text-3xl font-extrabold tracking-tight text-slate-800 md:text-4xl">
                Select Pharmacy
              </h1>
              <p className="mt-1 font-['Inter'] text-sm text-slate-500">
                Compare pharmacy stock and add the selected medicines to your cart.
              </p>
            </div>
            <div className="rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-slate-200 backdrop-blur">
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() => setSortBy("availability")}
                  className={cn(
                    "rounded-full px-4 text-xs font-semibold",
                    sortBy === "availability"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-transparent text-foreground shadow-none hover:bg-muted",
                  )}
                >
                  Sort by Availability
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSortBy("price")}
                  className={cn(
                    "rounded-full px-4 text-xs font-semibold",
                    sortBy === "price"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-transparent text-foreground shadow-none hover:bg-muted",
                  )}
                >
                  Sort by Price
                </Button>
              </div>
            </div>
          </div>

        {loading ? (
          <Card className="overflow-hidden rounded-2xl border-white/60 bg-white/90 shadow-[0_24px_40px_-20px_rgba(44,52,55,0.15)]">
            <CardContent className="py-14 text-center">
              <div className="space-y-3">
                <div className="flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary"></div>
                </div>
                <p className="font-medium text-slate-700">Loading available pharmacies...</p>
                <p className="text-sm text-slate-500">This may take a moment</p>
              </div>
            </CardContent>
          </Card>
        ) : !data?.requestedItems.length ? (
          <Card className="overflow-hidden rounded-2xl border-white/60 bg-white/90 shadow-[0_24px_40px_-20px_rgba(44,52,55,0.15)]">
            <CardContent className="py-14 text-center">
              <div className="space-y-3">
                <ShoppingCart className="mx-auto h-12 w-12 text-slate-300" />
                <p className="text-lg font-semibold text-slate-700">Your cart is empty</p>
                <p className="text-sm text-slate-500">Add medicines to see pharmacy availability.</p>
                <Button className="mt-4" onClick={() => router.push("/")}>
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : !data.stores.length ? (
          <Card className="overflow-hidden rounded-2xl border-white/60 bg-white/90 shadow-[0_24px_40px_-20px_rgba(44,52,55,0.15)]">
            <CardContent className="py-14">
              <div className="space-y-6 text-center">
                <div className="space-y-2">
                  <Store className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="text-lg font-semibold text-slate-700">No pharmacies found</p>
                  <p className="text-sm text-slate-500">The medicines you requested don't have active pharmacy listings yet.</p>
                </div>
                {data?.diagnostics && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-left">
                    <div className="space-y-3 text-sm">
                      <p className="font-semibold text-slate-900">Availability Summary</p>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs text-slate-600">Medicines Requested</p>
                          <p className="text-xl font-bold text-slate-900">{data.diagnostics.totalMedicinesRequested}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-3">
                          <p className="text-xs text-slate-600">With Stock</p>
                          <p className="text-xl font-bold text-emerald-600">{data.diagnostics.medicinesWithListings}</p>
                        </div>
                        <div className="rounded-lg bg-destructive/10 p-3">
                          <p className="text-xs text-slate-600">Out of Stock</p>
                          <p className="text-xl font-bold text-destructive">{data.diagnostics.medicinesWithoutListings}</p>
                        </div>
                        <div className="rounded-lg bg-slate-100 p-3">
                          <p className="text-xs text-slate-600">Pharmacies Checked</p>
                          <p className="text-xl font-bold text-slate-900">{data.diagnostics.totalStoresChecked}</p>
                        </div>
                      </div>
                      {data.diagnostics.missingMedicines?.length > 0 && (
                        <div className="space-y-2 border-t border-slate-200 pt-3">
                          <p className="font-semibold text-slate-900">Out of Stock Items</p>
                          <div className="flex flex-wrap gap-2">
                            {data.diagnostics.missingMedicines.map((med: any) => (
                              <Badge 
                                key={med.medicineId} 
                                variant="outline" 
                                className="border-destructive/50 text-destructive"
                              >
                                {med.medicineName} <span className="ml-1 opacity-75">×{med.quantity}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-slate-600">
              Found <span className="font-semibold text-slate-900">{data.stores.length}</span> pharmacies for your selection
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.stores.map((store, idx) => {
                const availableLines = store.items.filter((line) => line.availableQuantity > 0);
                const partialCount = store.items.filter((line) => line.status === "partial").length;
                const outCount = store.items.filter((line) => line.status === "not_available").length;
                const approxDistanceKm = 1 + (idx % 4) * 0.7;
                const coveragePercent = getCoveragePercent(store);
                const isBestOption = idx === 0;

                return (
                <Card 
                  key={store.medicalStoreId} 
                  className={cn(
                    "flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                    isBestOption && "ring-2 ring-primary/20"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Store className="h-5 w-5 text-slate-600" />
                            <CardTitle className="font-['Manrope'] text-xl font-bold text-slate-800">{store.storeName}</CardTitle>
                          </div>
                          {isBestOption ? (
                            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Best option</Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 font-['Inter'] text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{approxDistanceKm.toFixed(1)} km away</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Open until 10:00 PM</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{formatMoney(store.currency, store.estimatedTotal)}</p>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-5">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="mb-3 flex items-end justify-between border-b border-slate-200 pb-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Coverage</p>
                        <p className="text-lg font-bold text-slate-900">{coveragePercent}%</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Available</p>
                          <p className="mt-1 text-lg font-bold text-emerald-600">{availableLines.length}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Partial</p>
                          <p className="mt-1 text-lg font-bold text-amber-600">{partialCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unavailable</p>
                          <p className="mt-1 text-lg font-bold text-rose-600">{outCount}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-10 flex-1"
                        onClick={() => setDetailsStoreId(store.medicalStoreId)}
                      >
                        View Details
                      </Button>
                      <Button
                        onClick={() => handleUsePharmacy(store)}
                        disabled={availableLines.length === 0 || syncingStoreId === store.medicalStoreId}
                        className="h-10 flex-[1.4] bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {syncingStoreId === store.medicalStoreId
                          ? "Adding to cart..."
                          : isPrescriptionFlow
                            ? "Add to cart"
                            : "Select Pharmacy"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>

            <Dialog open={Boolean(detailsStore)} onOpenChange={(open) => { if (!open) setDetailsStoreId(null); }}>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="font-['Manrope'] text-xl">{detailsStore?.storeName} - Medicine Details</DialogTitle>
                </DialogHeader>

                {detailsStore ? (
                  <div className="space-y-3">
                    {detailsStore.items.map((line) => {
                      const key = `${detailsStore.medicalStoreId}:${line.cartItemId}`;
                      const currentQty = qtyByKey[key] ?? Math.min(line.requestedQuantity, Math.max(1, line.availableQuantity));

                      return (
                        <div key={line.cartItemId} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{line.medicineName}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Requested: {line.requestedQuantity}
                                {line.unitPrice ? ` • Unit: ${detailsStore.currency} ${Number(line.unitPrice).toFixed(2)}` : ""}
                              </p>
                            </div>
                            <div>
                              {line.status === "full" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                  <CircleCheck className="h-3.5 w-3.5" /> In stock
                                </span>
                              ) : line.status === "partial" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                  <AlertTriangle className="h-3.5 w-3.5" /> {line.availableQuantity} of {line.requestedQuantity} available
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                                  <CircleOff className="h-3.5 w-3.5" /> Unavailable
                                </span>
                              )}
                            </div>
                          </div>

                          {line.availableQuantity > 0 ? (
                            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                              <span className="text-xs text-slate-600">Quantity</span>
                              <Input
                                type="number"
                                min={1}
                                max={line.availableQuantity}
                                value={String(currentQty)}
                                onChange={(e) => handleQtyChange(detailsStore, line.cartItemId, e.target.value, line.availableQuantity)}
                                className="h-8 w-20"
                              />
                              <span className="text-xs text-slate-500">Max {line.availableQuantity}</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    <div className="sticky bottom-0 bg-background pt-2">
                      <Button
                        onClick={() => handleUsePharmacy(detailsStore)}
                        disabled={syncingStoreId === detailsStore.medicalStoreId}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {syncingStoreId === detailsStore.medicalStoreId
                          ? "Adding to cart..."
                          : `${isPrescriptionFlow ? "Add to cart" : "Select Pharmacy"} - ${formatMoney(detailsStore.currency, detailsStore.estimatedTotal)}`}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
      </div>
    </PublicLayout>
  );
}


