"use client";

import { useEffect, useState } from "react";
import PublicLayout from "@/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Loader from "@/components/ui/loader";
import orderApi from "./_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { CalendarDays, Package, CreditCard, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function OrdersPage() {
  const { showError } = useCustomToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [orderDetailsById, setOrderDetailsById] = useState<Record<string, any>>({});
  const [loadingDetailsById, setLoadingDetailsById] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

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
              <div className="space-y-4">
                {orders.map((order) => (
                  <Collapsible
                    key={order.id}
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
                        <p className="text-xs text-muted-foreground">
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
