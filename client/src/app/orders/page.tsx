"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PublicLayout from "@/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Loader from "@/components/ui/loader";
import orderApi from "./_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { CalendarDays, Package, CreditCard, ChevronDown, History } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function OrdersPage() {
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
      <div className="container mx-auto px-4 py-8">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Package className="h-6 w-6 text-primary" />
              My Orders
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track your medicine purchases and payment progress.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
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
                    className="rounded-xl border bg-card p-4 hover:border-primary/30 transition-colors"
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
                        <p className="font-semibold">PKR {Number(order.total || 0).toFixed(2)}</p>
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
                      <div className="mt-3 rounded-lg border bg-muted/20 p-3 space-y-3">
                        {loadingDetailsById[order.id] ? (
                          <p className="text-sm text-muted-foreground">Loading items...</p>
                        ) : !orderDetailsById[order.id]?.items?.length ? (
                          <p className="text-sm text-muted-foreground">No items found in this order.</p>
                        ) : (
                          orderDetailsById[order.id].items.map((item: any) => {
                            const firstImage = extractFirstImage(item.medicineImages);
                            return (
                              <div key={item.id} className="flex items-center gap-3 rounded-md border bg-background p-2">
                                <div className="h-14 w-14 shrink-0 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
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
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{item.medicineName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Qty: {item.quantity} x PKR {Number(item.unitPrice || 0).toFixed(2)}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold">PKR {Number(item.lineTotal || 0).toFixed(2)}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CollapsibleContent>
    </Collapsible>
  );
}
