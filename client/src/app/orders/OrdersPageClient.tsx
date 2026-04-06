"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PublicLayout from "@/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Loader from "@/components/ui/loader";
import orderApi from "./_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import {
  CalendarDays,
  Package,
  CreditCard,
  ChevronDown,
  History,
  MapPin,
  Phone,
  Loader2,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/shell/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cardSectionClass, publicPageContainerClass, surfaceListItemClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ShippingAddressEntry = {
  id: string;
  label: string;
  addressLine: string;
  contactNo: string;
  isDefault?: boolean;
};

export default function OrdersPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showError, showSuccess, showInfo } = useCustomToast();
  const handledPaymentToastKeysRef = useRef<Set<string>>(new Set());
  const [orders, setOrders] = useState<any[]>([]);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [orderDetailsById, setOrderDetailsById] = useState<Record<string, any>>({});
  const [loadingDetailsById, setLoadingDetailsById] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [orderScope, setOrderScope] = useState<"active" | "history">("active");
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddressEntry[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState("");
  const [addressLineInput, setAddressLineInput] = useState("");
  const [contactNoInput, setContactNoInput] = useState("");
  const [addressesDialogOpen, setAddressesDialogOpen] = useState(false);

  const { activeOrders, historyOrders, activeCount, historyCount } = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    const active: typeof list = [];
    const history: typeof list = [];
    for (const o of list) {
      if (orderIsHistoryStatus(o?.status)) history.push(o);
      else active.push(o);
    }
    return {
      activeOrders: active,
      historyOrders: history,
      activeCount: active.length,
      historyCount: history.length,
    };
  }, [orders]);

  const visibleOrders = orderScope === "history" ? historyOrders : activeOrders;

  useEffect(() => {
    if (openOrderId && !visibleOrders.some((o) => o.id === openOrderId)) {
      setOpenOrderId(null);
    }
  }, [orderScope, visibleOrders, openOrderId]);

  useEffect(() => {
    const paymentState = searchParams.get("payment");
    const sessionId = searchParams.get("session_id") || "";

    if (!paymentState) return;

    const toastKey = `${paymentState}:${sessionId}`;
    if (handledPaymentToastKeysRef.current.has(toastKey)) {
      return;
    }
    handledPaymentToastKeysRef.current.add(toastKey);

    if (paymentState === "success") {
      showSuccess("Order successful", "Your payment was received and your order is confirmed.");
    } else if (paymentState === "cancelled") {
      showInfo("Payment cancelled", "Your order was not completed. You can try again when ready.");
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("payment");
    nextParams.delete("session_id");
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [searchParams, showSuccess, showInfo, pathname, router]);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await orderApi.getOrders();
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        showError("Failed to load orders", getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!addressesDialogOpen) return;
    let cancelled = false;
    (async () => {
      try {
        setAddressLoading(true);
        const rows = (await orderApi.getShippingAddresses()) as ShippingAddressEntry[];
        if (!cancelled) setShippingAddresses(Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (!cancelled) showError("Could not load addresses", getErrorMessage(error));
      } finally {
        if (!cancelled) setAddressLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addressesDialogOpen]);

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressLabel("");
    setAddressLineInput("");
    setContactNoInput("");
  };

  const startEditAddress = (address: ShippingAddressEntry) => {
    setEditingAddressId(address.id);
    setAddressLabel(address.label);
    setAddressLineInput(address.addressLine);
    setContactNoInput(address.contactNo);
  };

  const saveAddress = async () => {
    const payload = {
      label: addressLabel.trim(),
      addressLine: addressLineInput.trim(),
      contactNo: contactNoInput.trim(),
      isDefault: editingAddressId == null && shippingAddresses.length === 0,
    };
    if (!payload.label || !payload.addressLine || !payload.contactNo) {
      showError("Missing fields", "Label, address and contact number are required.");
      return;
    }
    try {
      setAddressSaving(true);
      const rows = editingAddressId
        ? ((await orderApi.updateShippingAddress(editingAddressId, payload)) as ShippingAddressEntry[])
        : ((await orderApi.createShippingAddress(payload)) as ShippingAddressEntry[]);
      setShippingAddresses(Array.isArray(rows) ? rows : []);
      resetAddressForm();
      showSuccess("Address saved", "Your address book has been updated.");
    } catch (error) {
      showError("Could not save address", getErrorMessage(error));
    } finally {
      setAddressSaving(false);
    }
  };

  const removeAddress = async (addressId: string) => {
    try {
      const rows = (await orderApi.deleteShippingAddress(addressId)) as ShippingAddressEntry[];
      setShippingAddresses(Array.isArray(rows) ? rows : []);
      showSuccess("Address removed", "Address removed from your address book.");
    } catch (error) {
      showError("Could not remove address", getErrorMessage(error));
    }
  };

  const formatDate = (value: string) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const getPaymentBadgeVariant = (status?: string) => {
    const key = String(status || "").toLowerCase();
    if (key === "paid") return "default";
    if (key.includes("pending")) return "secondary";
    return "outline";
  };

  const extractFirstImage = (images: any): string | null => {
    if (!images) return null;
    if (Array.isArray(images) && images.length > 0) {
      const first = images[0];
      if (typeof first === "string") return first;
      if (typeof first === "object" && first?.url) return String(first.url);
    }
    if (typeof images === "string") return images;
    return null;
  };

  const loadOrderDetails = async (orderId: string) => {
    if (orderDetailsById[orderId] || loadingDetailsById[orderId]) return;
    try {
      setLoadingDetailsById((prev) => ({ ...prev, [orderId]: true }));
      const data = await orderApi.getOrderById(orderId);
      setOrderDetailsById((prev) => ({ ...prev, [orderId]: data }));
    } catch (error) {
      showError("Failed to load order items", getErrorMessage(error));
    } finally {
      setLoadingDetailsById((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <PublicLayout>
      <div className={publicPageContainerClass("space-y-6")}>
        <PageHeader
          title="My orders"
          description="Track your medicine purchases and payment progress."
          icon={Package}
          action={
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setAddressesDialogOpen(true)}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              Shipping addresses
            </Button>
          }
        />

        <Dialog
          open={addressesDialogOpen}
          onOpenChange={(open) => {
            setAddressesDialogOpen(open);
            if (!open) resetAddressForm();
          }}
        >
          <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
            <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.08] via-primary/[0.03] to-transparent px-6 pb-5 pt-6">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm ring-1 ring-primary/10">
                  <MapPin className="h-6 w-6" />
                </div>
                <DialogHeader className="space-y-1.5 p-0 text-left">
                  <DialogTitle className="text-xl font-bold tracking-tight">Shipping addresses</DialogTitle>
                  <DialogDescription className="text-[13px] leading-relaxed">
                    These are used at checkout so you don&apos;t have to type them every time. Add a few
                    favourites and pick one when you order.
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>

            <div className="flex max-h-[min(60vh,420px)] flex-col gap-0 overflow-hidden px-6 pt-5">
              <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Saved addresses
                  </p>
                  {!addressLoading && shippingAddresses.length > 0 ? (
                    <p className="text-[11px] text-muted-foreground/90">
                      {shippingAddresses.length}{" "}
                      {shippingAddresses.length === 1 ? "address" : "addresses"}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 rounded-full px-3"
                  onClick={() => resetAddressForm()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add new
                </Button>
              </div>

              {addressLoading ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/25 py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
                  <p className="text-sm font-medium text-muted-foreground">Loading your addresses…</p>
                </div>
              ) : shippingAddresses.length === 0 ? (
                <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/20 bg-muted/20 px-6 py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin className="h-7 w-7 opacity-80" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No addresses yet</p>
                    <p className="max-w-[260px] text-xs leading-relaxed text-muted-foreground">
                      Add your delivery address below. You can save more than one and choose at checkout.
                    </p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="min-h-0 flex-1 pr-3">
                  <ul className="space-y-2.5 pb-1">
                    {shippingAddresses.map((a) => (
                      <li key={a.id}>
                        <div
                          className={cn(
                            "group rounded-2xl border bg-card p-4 shadow-sm transition-all",
                            a.isDefault
                              ? "border-primary/35 ring-1 ring-primary/15"
                              : "border-border/80 hover:border-primary/25",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-foreground">{a.label}</span>
                                {a.isDefault ? (
                                  <Badge
                                    variant="secondary"
                                    className="rounded-full border-0 bg-primary/15 px-2 py-0 text-[10px] font-bold uppercase tracking-wide text-primary"
                                  >
                                    Default
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="flex gap-2 text-sm leading-snug text-muted-foreground">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
                                <span className="min-w-0">{a.addressLine}</span>
                              </p>
                              <p className="flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
                                <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                                {a.contactNo}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-start">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                onClick={() => startEditAddress(a)}
                                aria-label={`Edit ${a.label}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeAddress(a.id)}
                                aria-label={`Remove ${a.label}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>

            <Separator className="my-0" />

            <div className="space-y-4 bg-muted/15 px-6 py-5">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {editingAddressId ? "Edit address" : "Add a new address"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {editingAddressId
                    ? "Update the details below, then save."
                    : "Fill in the fields and save to your address book."}
                </p>
              </div>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="addr-label">Label</Label>
                  <Input
                    id="addr-label"
                    placeholder="e.g. Home, Office, Parents"
                    value={addressLabel}
                    onChange={(e) => setAddressLabel(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addr-line">Street address</Label>
                  <Input
                    id="addr-line"
                    placeholder="House, street, area"
                    value={addressLineInput}
                    onChange={(e) => setAddressLineInput(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addr-phone">Contact number</Label>
                  <Input
                    id="addr-phone"
                    type="tel"
                    placeholder="Mobile for delivery updates"
                    value={contactNoInput}
                    onChange={(e) => setContactNoInput(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {editingAddressId ? (
                  <Button type="button" variant="outline" onClick={resetAddressForm} className="sm:order-1">
                    Cancel
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="gap-2 sm:min-w-[140px]"
                  onClick={saveAddress}
                  disabled={addressSaving}
                >
                  {addressSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : editingAddressId ? (
                    "Save changes"
                  ) : (
                    "Save address"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Card className={cardSectionClass()}>
          <CardContent className="space-y-3 p-6">
            {loading ? (
              <Loader title="Loading orders" description="Fetching your orders..." />
            ) : orders.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No orders yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your placed orders will appear here.
                </p>
              </div>
            ) : (
              <Tabs
                value={orderScope}
                onValueChange={(v) => setOrderScope(v as "active" | "history")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-auto gap-1 p-1 sm:inline-flex sm:w-full sm:max-w-md">
                  <TabsTrigger value="active" className="gap-2 py-2.5 text-xs sm:text-sm">
                    <Package className="h-4 w-4 shrink-0" />
                    <span className="truncate">Active</span>
                    {activeCount > 0 ? (
                      <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] sm:text-xs">
                        {activeCount}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2 py-2.5 text-xs sm:text-sm">
                    <History className="h-4 w-4 shrink-0" />
                    <span className="truncate">History</span>
                    {historyCount > 0 ? (
                      <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] sm:text-xs">
                        {historyCount}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                </TabsList>
                <p className="text-xs text-muted-foreground mt-2 mb-4">
                  {orderScope === "active"
                    ? "Orders still being prepared or on the way."
                    : "Delivered orders and returns."}
                </p>
                <TabsContent value="active" className="mt-0 space-y-4 focus-visible:outline-none">
                  {activeOrders.length === 0 ? (
                    <OrderTabEmpty
                      title="No active orders"
                      description="When you place an order, it will show here until it is delivered."
                    />
                  ) : (
                    activeOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        openOrderId={openOrderId}
                        setOpenOrderId={setOpenOrderId}
                        loadOrderDetails={loadOrderDetails}
                        orderDetailsById={orderDetailsById}
                        loadingDetailsById={loadingDetailsById}
                        formatDate={formatDate}
                        getPaymentBadgeVariant={getPaymentBadgeVariant}
                        extractFirstImage={extractFirstImage}
                      />
                    ))
                  )}
                </TabsContent>
                <TabsContent value="history" className="mt-0 space-y-4 focus-visible:outline-none">
                  {historyOrders.length === 0 ? (
                    <OrderTabEmpty
                      title="No order history yet"
                      description="Completed deliveries and returns will appear here."
                    />
                  ) : (
                    historyOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        openOrderId={openOrderId}
                        setOpenOrderId={setOpenOrderId}
                        loadOrderDetails={loadOrderDetails}
                        orderDetailsById={orderDetailsById}
                        loadingDetailsById={loadingDetailsById}
                        formatDate={formatDate}
                        getPaymentBadgeVariant={getPaymentBadgeVariant}
                        extractFirstImage={extractFirstImage}
                      />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

function orderIsHistoryStatus(status: unknown): boolean {
  const s = String(status ?? "")
    .toLowerCase()
    .trim();
  return s === "delivered" || s === "returned";
}

function OrderTabEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

type OrderCardProps = {
  order: any;
  openOrderId: string | null;
  setOpenOrderId: (id: string | null) => void;
  loadOrderDetails: (orderId: string) => void;
  orderDetailsById: Record<string, any>;
  loadingDetailsById: Record<string, boolean>;
  formatDate: (value: string) => string;
  getPaymentBadgeVariant: (status?: string) => "default" | "secondary" | "outline";
  extractFirstImage: (images: any) => string | null;
};

function OrderCard({
  order,
  openOrderId,
  setOpenOrderId,
  loadOrderDetails,
  orderDetailsById,
  loadingDetailsById,
  formatDate,
  getPaymentBadgeVariant,
  extractFirstImage,
}: OrderCardProps) {
  return (
    <Collapsible
                    open={openOrderId === order.id}
                    onOpenChange={(open) => {
                      setOpenOrderId(open ? order.id : null);
                      if (open) {
                        loadOrderDetails(order.id);
                      }
                    }}
                    className={cn(surfaceListItemClass(), "p-4 transition-colors hover:border-primary/30")}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground break-all">
                          ID: {order.id}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{String(order.status || "placed").toUpperCase()}</Badge>
                        <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>
                          {String(order.paymentStatus || "pending").replaceAll("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Amount</p>
                        <p className="font-semibold tabular-nums">
                          PKR {Number(order.total || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          Payment Method
                        </p>
                        <p className="font-medium">{String(order.paymentMethod || "N/A").toUpperCase()}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          Placed At
                        </p>
                        <p className="font-medium">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <CollapsibleTrigger asChild>
                      <button
                        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        type="button"
                      >
                        View order items
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            openOrderId === order.id ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3 rounded-md border border-border/80 bg-muted/20 p-3">
                        {loadingDetailsById[order.id] ? (
                          <p className="text-sm text-muted-foreground">Loading items...</p>
                        ) : !orderDetailsById[order.id]?.items?.length ? (
                          <p className="text-sm text-muted-foreground">No items found in this order.</p>
                        ) : (
                          <Table className="min-w-[520px]">
                            <TableHeader className="[&_th]:bg-muted/50">
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="font-medium">Product</TableHead>
                                <TableHead className="text-right font-medium tabular-nums">Qty</TableHead>
                                <TableHead className="text-right font-medium tabular-nums">Unit</TableHead>
                                <TableHead className="text-right font-medium tabular-nums">Line</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orderDetailsById[order.id].items.map((item: any) => {
                                const firstImage = extractFirstImage(item.medicineImages);
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                                          {firstImage ? (
                                            <img
                                              src={firstImage}
                                              alt={item.medicineName}
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <Package className="h-5 w-5 text-muted-foreground" />
                                          )}
                                        </div>
                                        <span className="max-w-[200px] text-sm font-medium leading-snug sm:max-w-none">
                                          {item.medicineName}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                      {item.quantity}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                      PKR {Number(item.unitPrice || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold tabular-nums">
                                      PKR {Number(item.lineTotal || 0).toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CollapsibleContent>
    </Collapsible>
  );
}
