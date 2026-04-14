"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/shell/app-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loader from "@/components/ui/loader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shell/page-header";
import { DashboardScrollWorkspace } from "@/components/shell/dashboard-scroll-workspace";
import { cardSectionClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import medicalStoreApi, {
  type WholesaleCatalogResponse,
  type WholesaleCatalogRow,
  type WholesaleManufacturerRow,
  type WholesaleOrderSummaryRow,
} from "../_api";
import { getErrorMessage } from "@/lib/error-utils";
import { Building2, ChevronLeft, ChevronRight, Package, RefreshCw, ShoppingCart } from "lucide-react";

const CATALOG_PAGE_SIZE = 15;
const ORDERS_PAGE_SIZE = 15;

function parseMoney(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function paymentBadgeVariant(
  paymentStatus: string,
): "default" | "secondary" | "outline" | "destructive" {
  const k = String(paymentStatus || "").toLowerCase();
  if (k === "paid") return "default";
  if (k.includes("pending")) return "secondary";
  if (k.includes("failed")) return "destructive";
  return "outline";
}

function formatPaymentLabel(raw: string) {
  return String(raw || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPaymentMethodLabel(raw: string) {
  const key = String(raw || "").trim().toLowerCase();
  if (key === "safepay" || key === "online") return "Online";
  if (key === "offline_terms" || key === "cod") return "COD";
  return "COD";
}

export default function MedicalStoreWholesaleOrderPage() {
  const [tab, setTab] = useState("place");

  const [manufacturers, setManufacturers] = useState<WholesaleManufacturerRow[]>([]);
  const [mfrLoading, setMfrLoading] = useState(true);
  const [mfrError, setMfrError] = useState<string | null>(null);
  const [manufacturerId, setManufacturerId] = useState<string>("");

  const [catalog, setCatalog] = useState<WholesaleCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const [orders, setOrders] = useState<{
    items: WholesaleOrderSummaryRow[];
    total: number;
    page: number;
    limit: number;
  } | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"safepay" | "offline_terms">("safepay");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadManufacturers = useCallback(async () => {
    setMfrLoading(true);
    setMfrError(null);
    try {
      const rows = await medicalStoreApi.listWholesaleManufacturers();
      setManufacturers(rows);
    } catch (e) {
      setMfrError(getErrorMessage(e));
      setManufacturers([]);
    } finally {
      setMfrLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManufacturers();
  }, [loadManufacturers]);

  const loadCatalog = useCallback(async () => {
    if (!manufacturerId) {
      setCatalog(null);
      return;
    }
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const res = await medicalStoreApi.getWholesaleCatalog(
        manufacturerId,
        catalogPage,
        CATALOG_PAGE_SIZE,
        debouncedSearch || undefined,
      );
      setCatalog(res);
    } catch (e) {
      setCatalogError(getErrorMessage(e));
      setCatalog(null);
    } finally {
      setCatalogLoading(false);
    }
  }, [manufacturerId, catalogPage, debouncedSearch]);

  useEffect(() => {
    if (!manufacturerId) return;
    loadCatalog();
  }, [manufacturerId, catalogPage, debouncedSearch, loadCatalog]);

  useEffect(() => {
    setCatalogPage(1);
  }, [manufacturerId, debouncedSearch]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const res = await medicalStoreApi.listWholesaleOrders(ordersPage, ORDERS_PAGE_SIZE);
      setOrders(res);
    } catch (e) {
      setOrdersError(getErrorMessage(e));
      setOrders(null);
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersPage]);

  useEffect(() => {
    if (tab === "history") {
      loadOrders();
    }
  }, [tab, loadOrders]);

  const onManufacturerChange = (value: string) => {
    setManufacturerId(value);
    setQuantities({});
    setSearchInput("");
    setDebouncedSearch("");
    setCatalogPage(1);
  };

  const setQty = (listingId: string, raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      setQuantities((q) => {
        const next = { ...q };
        delete next[listingId];
        return next;
      });
      return;
    }
    const n = parseInt(trimmed, 10);
    if (!Number.isInteger(n) || n < 0) return;
    setQuantities((q) => ({ ...q, [listingId]: n }));
  };

  const cartLines = useMemo(() => {
    if (!catalog) return [];
    const lines: { row: WholesaleCatalogRow; qty: number }[] = [];
    for (const row of catalog.items) {
      const qty = quantities[row.listingId];
      if (qty !== undefined && qty > 0) {
        lines.push({ row, qty });
      }
    }
    return lines;
  }, [catalog, quantities]);

  const cartTotals = useMemo(() => {
    let sub = 0;
    for (const { row, qty } of cartLines) {
      sub += parseMoney(row.wholesalePrice) * qty;
    }
    return { subtotal: sub, lines: cartLines.length };
  }, [cartLines]);

  const currency = catalog?.items[0]?.currency ?? cartLines[0]?.row.currency ?? "PKR";

  const validationError = useMemo(() => {
    for (const { row, qty } of cartLines) {
      if (qty < row.moq) {
        return `“${row.medicineName}”: quantity must be at least MOQ (${row.moq}).`;
      }
    }
    return null;
  }, [cartLines]);

  const placeOrder = async () => {
    if (!manufacturerId || cartLines.length === 0) return;
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const created = await medicalStoreApi.createWholesaleOrder({
        manufacturerId,
        items: cartLines.map(({ row, qty }) => ({
          manufacturerMedicineId: row.listingId,
          quantity: qty,
        })),
        notes: notes.trim() || undefined,
        paymentMethod,
      });
      if (created.payment.method === "safepay") {
        toast.success("Redirecting to secure checkout...");
        window.location.href = created.payment.checkoutUrl;
        return;
      }
      toast.success("Wholesale order placed on offline terms.");
      setConfirmOpen(false);
      setNotes("");
      setQuantities({});
      setTab("history");
      setOrdersPage(1);
      loadOrders();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const catalogTotalPages = catalog ? Math.max(1, Math.ceil(catalog.total / CATALOG_PAGE_SIZE)) : 1;
  const ordersTotalPages = orders ? Math.max(1, Math.ceil(orders.total / ORDERS_PAGE_SIZE)) : 1;
  const showFloatingOrderBar = tab === "place" && !!manufacturerId && cartTotals.lines > 0;

  return (
    <>
      <DashboardScrollWorkspace
        bodyClassName="overflow-y-auto"
        header={
          <PageHeader
            title="Order from manufacturer"
            description="Pick one manufacturer, set quantities at or above MOQ for each line, and place a single wholesale order (backorders allowed when stock is low)."
            icon={Building2}
          />
        }
      >
        <div
          className={cn(
            "min-h-0",
            showFloatingOrderBar ? "pb-24" : "pb-6",
          )}
        >
          <Tabs value={tab} onValueChange={setTab} className="w-full gap-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 sm:w-fit">
            <TabsTrigger value="place" className="gap-2">
              <ShoppingCart className="h-4 w-4 shrink-0" />
              Place order
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Package className="h-4 w-4 shrink-0" />
              My wholesale orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="place" className="mt-0 space-y-6">
            <Card className={cn(cardSectionClass(), "border-border/80 shadow-sm")}>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Manufacturer</CardTitle>
                  <CardDescription>Only active manufacturers are listed.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 self-start sm:self-auto"
                  onClick={loadManufacturers}
                  disabled={mfrLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${mfrLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {mfrLoading && !manufacturers.length ? (
                  <Loader title="Loading manufacturers" description="Fetching partners…" />
                ) : null}
                {mfrError ? (
                  <p className="text-sm text-destructive">{mfrError}</p>
                ) : null}
                {!mfrLoading || manufacturers.length ? (
                  <div className="grid gap-4 sm:max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="mfr-select">Manufacturer</Label>
                      <Select
                        value={manufacturerId || undefined}
                        onValueChange={onManufacturerChange}
                        disabled={!manufacturers.length}
                      >
                        <SelectTrigger id="mfr-select" className="w-full">
                          <SelectValue placeholder={manufacturers.length ? "Select manufacturer" : "No manufacturers"} />
                        </SelectTrigger>
                        <SelectContent>
                          {manufacturers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {manufacturerId ? (
                      <div className="space-y-2">
                        <Label htmlFor="catalog-search">Search catalog</Label>
                        <Input
                          id="catalog-search"
                          placeholder="Filter by product name…"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {manufacturerId ? (
              <Card className={cn(cardSectionClass(), "border-border/80 shadow-sm")}>
                <CardHeader>
                  <CardTitle className="text-lg">Catalog</CardTitle>
                  <CardDescription>
                    {catalogLoading
                      ? "Loading…"
                      : catalog
                        ? `Showing ${catalog.items.length} of ${catalog.total} active listings (page ${catalog.page}).`
                        : "—"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {catalogError ? (
                    <p className="text-sm text-destructive">{catalogError}</p>
                  ) : null}
                  {catalogLoading && !catalog ? (
                    <div className="flex min-h-[200px] items-center justify-center">
                      <Loader title="Loading catalog" description="Fetching wholesale prices…" />
                    </div>
                  ) : null}
                  {catalog && catalog.items.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No matching products for this search.</p>
                  ) : null}
                  {catalog && catalog.items.length > 0 ? (
                    <>
                      <div className="rounded-md border border-border/80">
                        <Table className="min-w-[720px]">
                          <TableHeader className="[&_th]:bg-muted/50">
                            <TableRow className="border-b hover:bg-transparent">
                              <TableHead className="font-medium">Product</TableHead>
                              <TableHead className="text-right font-medium">Wholesale</TableHead>
                              <TableHead className="text-right font-medium">MOQ</TableHead>
                              <TableHead className="text-right font-medium">Stock</TableHead>
                              <TableHead className="text-right font-medium">Qty</TableHead>
                              <TableHead className="text-right font-medium">Line</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {catalog.items.map((row) => {
                              const q = quantities[row.listingId] ?? 0;
                              const line = q > 0 ? parseMoney(row.wholesalePrice) * q : 0;
                              return (
                                <TableRow key={row.listingId}>
                                  <TableCell>
                                    <div className="max-w-[240px] font-medium leading-snug">{row.medicineName}</div>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {row.currency} {row.wholesalePrice}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{row.moq}</TableCell>
                                  <TableCell className="text-right tabular-nums text-muted-foreground">
                                    {row.listedQuantity.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      className="ml-auto h-8 w-20 text-right tabular-nums"
                                      inputMode="numeric"
                                      placeholder="0"
                                      value={
                                        quantities[row.listingId] === undefined ? "" : String(quantities[row.listingId])
                                      }
                                      onChange={(e) => setQty(row.listingId, e.target.value)}
                                    />
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {q > 0 ? `${row.currency} ${line.toFixed(2)}` : "—"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      {catalogTotalPages > 1 ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-muted-foreground text-xs">
                            Page {catalogPage} / {catalogTotalPages}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={catalogPage <= 1 || catalogLoading}
                              onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                              className="gap-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={catalogPage >= catalogTotalPages || catalogLoading}
                              onClick={() => setCatalogPage((p) => p + 1)}
                              className="gap-1"
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="history" className="mt-0 space-y-6">
            <Card className={cn(cardSectionClass(), "border-border/80 shadow-sm")}>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Order history</CardTitle>
                  <CardDescription>Wholesale purchase orders you have submitted.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={loadOrders}
                  disabled={ordersLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${ordersLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {ordersError ? <p className="text-sm text-destructive">{ordersError}</p> : null}
                {ordersLoading && !orders ? (
                  <div className="flex min-h-[160px] items-center justify-center">
                    <Loader title="Loading orders" description="Fetching your wholesale orders…" />
                  </div>
                ) : null}
                {orders && orders.items.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No wholesale orders yet.</p>
                ) : null}
                {orders && orders.items.length > 0 ? (
                  <>
                    <div className="rounded-md border border-border/80">
                      <Table className="min-w-[720px]">
                        <TableHeader className="[&_th]:bg-muted/50">
                          <TableRow className="border-b hover:bg-transparent">
                            <TableHead className="font-medium">Date</TableHead>
                            <TableHead className="font-medium">Manufacturer</TableHead>
                            <TableHead className="font-medium">Status</TableHead>
                            <TableHead className="font-medium">Payment</TableHead>
                            <TableHead className="font-medium">Method</TableHead>
                            <TableHead className="text-right font-medium">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.items.map((o) => (
                            <TableRow key={o.id}>
                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {format(new Date(o.createdAt), "MMM d, yyyy HH:mm")}
                              </TableCell>
                              <TableCell>{o.manufacturerDisplayName ?? "—"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-normal capitalize">
                                  {o.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={paymentBadgeVariant(o.paymentStatus)}>
                                  {formatPaymentLabel(o.paymentStatus)}
                                </Badge>
                              </TableCell>
                              <TableCell className="capitalize text-muted-foreground">
                                {formatPaymentMethodLabel(o.paymentMethod)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {o.currency} {o.total}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {ordersTotalPages > 1 ? (
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <p className="text-muted-foreground text-xs">
                          Page {ordersPage} / {ordersTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={ordersPage <= 1 || ordersLoading}
                            onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                            className="gap-1"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={ordersPage >= ordersTotalPages || ordersLoading}
                            onClick={() => setOrdersPage((p) => p + 1)}
                            className="gap-1"
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </DashboardScrollWorkspace>

      {showFloatingOrderBar ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md dark:shadow-[0_-4px_24px_rgba(0,0,0,0.25)]">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{cartTotals.lines}</span> line
                {cartTotals.lines === 1 ? "" : "s"} · Subtotal{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {currency} {cartTotals.subtotal.toFixed(2)}
                </span>
              </p>
              {validationError ? <p className="mt-1 text-xs text-destructive">{validationError}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTab("history")}
              >
                My orders
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={cartTotals.lines === 0 || !!validationError || catalogLoading}
                onClick={() => setConfirmOpen(true)}
              >
                Place order
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AppDialogContent size="sm" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm wholesale order</DialogTitle>
            <DialogDescription>
              You are placing one order with {cartTotals.lines} line{cartTotals.lines === 1 ? "" : "s"} totaling{" "}
              {currency} {cartTotals.subtotal.toFixed(2)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="wholesale-payment-method">Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as "safepay" | "offline_terms")}
              disabled={submitting}
            >
              <SelectTrigger id="wholesale-payment-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="safepay">Pay online</SelectItem>
                <SelectItem value="offline_terms">Offline terms / COD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-notes">Notes for manufacturer (optional)</Label>
            <Textarea
              id="order-notes"
              placeholder="Delivery window, reference PO number, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={placeOrder} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit order"}
            </Button>
          </DialogFooter>
        </AppDialogContent>
      </Dialog>
    </>
  );
}
