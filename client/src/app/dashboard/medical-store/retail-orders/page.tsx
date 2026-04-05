"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loader from "@/components/ui/loader";
import medicalStoreApi, { type RetailOrderLine, type RetailOrderRow } from "@/app/dashboard/medical-store/_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { formatRetailPriceLine } from "@/lib/format-money";
import { CreditCard, Mail, MapPin, Package, Phone, Pill, User } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PaginationBar } from "@/components/shell/pagination-bar";
import { DashboardScrollWorkspace } from "@/components/shell/dashboard-scroll-workspace";
import { cardSectionClass, surfaceInsetClass, surfaceListItemClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["pending", "placed", "shipped", "delivered", "returned"] as const;

function normalizeStatus(value: string | undefined): string {
  const key = String(value || "").toLowerCase();
  if (key === "placed") return "pending";
  return key || "pending";
}

function extractFirstImage(images: unknown): string | null {
  if (!images) return null;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === "string") return first;
    if (typeof first === "object" && first !== null && "url" in first && typeof (first as { url?: string }).url === "string") {
      return (first as { url: string }).url;
    }
  }
  if (typeof images === "string") return images;
  return null;
}

function fulfillmentBadgeProps(status: string): { label: string; className: string } {
  const s = String(status || "").toLowerCase();
  if (s === "delivered") {
    return {
      label: "Delivered",
      className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
    };
  }
  if (s === "shipped") {
    return { label: "Shipped", className: "border-primary/40 bg-primary/10 text-primary" };
  }
  if (s === "returned") {
    return {
      label: "Returned",
      className: "border-destructive/35 bg-destructive/10 text-destructive",
    };
  }
  if (s === "placed" || s === "pending") {
    return { label: s === "placed" ? "Placed" : "Pending", className: "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100" };
  }
  return { label: status || "—", className: "" };
}

function paymentBadgeVariant(
  paymentStatus: string,
): "default" | "secondary" | "outline" | "destructive" {
  const k = String(paymentStatus || "").toLowerCase();
  if (k === "paid") return "default";
  if (k.includes("pending")) return "secondary";
  return "outline";
}

function formatPaymentLabel(raw: string) {
  return String(raw || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MedicalStoreRetailOrdersPage() {
  const { showError, showSuccess } = useCustomToast();
  const [orders, setOrders] = useState<RetailOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await medicalStoreApi.listRetailOrders(page, limit);
      setOrders(data.items || []);
      setTotal(data.total ?? 0);
    } catch (error) {
      showError("Failed to load orders", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateStatus = async (orderId: string, nextStatus: string) => {
    try {
      setUpdatingId(orderId);
      await medicalStoreApi.updateRetailOrderStatus(orderId, nextStatus);
      showSuccess("Order updated", "Status saved.");
      await loadOrders();
    } catch (error) {
      showError("Status update failed", getErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <DashboardScrollWorkspace
      header={
        <PageHeader
          title="Patient orders"
          description="Orders routed to your pharmacy from the marketplace. Each order shows line items, quantities, and prices as the patient paid — update fulfillment status and use shipping details below."
          icon={Package}
        />
      }
    >
      <Card className={cn(cardSectionClass(), "flex h-full min-h-0 flex-col overflow-hidden")}>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6 pt-6">
          {loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Loader title="Loading orders" description="Fetching patient orders and line items..." />
            </div>
          ) : orders.length === 0 ? (
            <div className="shrink-0 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
              <Package className="mx-auto mb-3 h-11 w-11 text-muted-foreground/60" />
              <p className="font-medium text-foreground">No patient orders yet</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                When customers buy from your listings, orders will appear here with full item breakdowns.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {orders.map((order) => (
                <RetailOrderCard
                  key={order.id}
                  order={order}
                  updating={updatingId === order.id}
                  onStatusChange={updateStatus}
                />
              ))}
            </div>
          )}

          {!loading ? (
            <PaginationBar
              className="shrink-0"
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              disabled={loading}
              summary={
                <>
                  Page {page} of {totalPages} · {total} order{total === 1 ? "" : "s"} total
                </>
              }
            />
          ) : null}
        </CardContent>
      </Card>
    </DashboardScrollWorkspace>
  );
}

function RetailOrderCard({
  order,
  updating,
  onStatusChange,
}: {
  order: RetailOrderRow;
  updating: boolean;
  onStatusChange: (orderId: string, status: string) => void;
}) {
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const fb = fulfillmentBadgeProps(order.status);
  const currency = order.currency?.trim() || "PKR";
  const placedAt = order.createdAt
    ? format(new Date(order.createdAt), "MMM d, yyyy · h:mm a")
    : "—";

  return (
    <div
      className={`${surfaceListItemClass()} overflow-hidden transition-colors hover:border-primary/25`}
    >
      <div className="border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={fb.className}>
                {fb.label}
              </Badge>
              <Badge variant={paymentBadgeVariant(order.paymentStatus)}>
                {formatPaymentLabel(order.paymentStatus)}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {lines.length} item{lines.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Order <span className="font-mono text-sm tracking-tight">#{order.id.slice(0, 8)}</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  {order.patientName}
                </span>
                <span className="text-border">·</span>
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{order.patientEmail}</span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:max-w-xs lg:w-56 lg:shrink-0">
            <label className="text-xs font-medium text-muted-foreground">Fulfillment status</label>
            <Select
              value={normalizeStatus(order.status)}
              onValueChange={(v) => onStatusChange(order.id, v)}
              disabled={updating}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updating ? <p className="text-xs text-muted-foreground">Saving…</p> : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className={`${surfaceInsetClass()} bg-background/80 p-3`}>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              Total
            </p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatRetailPriceLine(currency, order.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {String(order.paymentMethod || "").toUpperCase() || "—"}
            </p>
          </div>
          <div className={`${surfaceInsetClass()} bg-background/80 p-3 sm:col-span-2`}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Placed</p>
            <p className="text-sm font-medium text-foreground">{placedAt}</p>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">ID: {order.id}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line items</p>
        {lines.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            No line items returned for this order.
          </p>
        ) : (
          <ul className="space-y-2">
            {lines.map((line, idx) => (
              <LineRow key={`${order.id}-${line.medicineId}-${idx}`} line={line} currency={currency} />
            ))}
          </ul>
        )}

        <Separator className="my-4" />

        <div className="grid gap-4 sm:grid-cols-2">
          {order.shippingAddress ? (
            <div className={`flex gap-3 ${surfaceInsetClass()} p-3`}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Ship to</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{order.shippingAddress}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-3 text-sm text-muted-foreground">
              No shipping address on file.
            </div>
          )}
          {order.contactNo ? (
            <div className={`flex gap-3 ${surfaceInsetClass()} p-3`}>
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Contact</p>
                <p className="mt-1 text-sm font-medium tabular-nums text-foreground">{order.contactNo}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-3 text-sm text-muted-foreground">
              No contact number on file.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LineRow({ line, currency }: { line: RetailOrderLine; currency: string }) {
  const img = extractFirstImage(line.images);
  const unit = Number(line.unitPrice);
  const total = Number(line.lineTotal);

  return (
    <li className={`flex gap-3 ${surfaceListItemClass()} bg-background p-3 hover:bg-muted/20`}>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted/50">
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Pill className="h-7 w-7 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug text-foreground">{line.medicineName}</p>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          Qty {line.quantity} ×{" "}
          {formatRetailPriceLine(currency, unit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatRetailPriceLine(currency, total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] text-muted-foreground">Line total</p>
      </div>
    </li>
  );
}
