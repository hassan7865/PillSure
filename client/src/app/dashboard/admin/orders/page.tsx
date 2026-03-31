"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loader from "@/components/ui/loader";
import { adminApi } from "../_components/_api";
import { AdminOrder, OrderStatus } from "../_components/_types";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";

const STATUS_OPTIONS: OrderStatus[] = ["pending", "shipped", "delivered", "returned"];
const normalizeStatus = (value: string | undefined): OrderStatus => {
  const key = String(value || "").toLowerCase();
  if (key === "placed") return "pending";
  if (key === "shipped") return "shipped";
  if (key === "delivered") return "delivered";
  if (key === "returned") return "returned";
  return "pending";
};

export default function AdminOrdersPage() {
  const { showError, showSuccess } = useCustomToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getOrders({
        page,
        limit: 10,
        search,
        status: status === "all" ? "" : status,
        dateFrom,
        dateTo,
      });
      setOrders(data.orders || []);
      setPagination(data.pagination);
    } catch (error) {
      showError("Failed to load orders", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page]);

  const applyFilters = async () => {
    setPage(1);
    await loadOrders();
  };

  const updateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      await adminApi.updateOrderStatus(orderId, nextStatus);
      showSuccess("Order updated", "Order status updated successfully.");
      await loadOrders();
    } catch (error) {
      showError("Status update failed", getErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Orders Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input
              placeholder="Search by order/patient"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Button onClick={applyFilters}>Apply Filters</Button>
          </div>

          {loading ? (
            <Loader title="Loading orders" description="Fetching admin orders..." />
          ) : (
            <div className="space-y-3">
              {orders.length === 0 && <p className="text-sm text-muted-foreground">No orders found.</p>}
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.patientName} ({order.patientEmail}) | PKR {Number(order.total).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Payment: {String(order.paymentMethod || "").toUpperCase()} | {String(order.paymentStatus || "").replaceAll("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Contact: {order.contactNo || "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">
                        Shipping Address: {order.shippingAddress || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={normalizeStatus(order.status)}
                        onValueChange={(value: OrderStatus) => updateStatus(order.id, value)}
                        disabled={updatingId === order.id}
                      >
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={!pagination.hasPrevPage || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={!pagination.hasNextPage || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
