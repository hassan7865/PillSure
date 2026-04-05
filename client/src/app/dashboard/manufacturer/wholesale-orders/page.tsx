"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Loader from "@/components/ui/loader";
import manufacturerApi, {
  type ManufacturerWholesaleOrderDetailResponse,
  type ManufacturerWholesaleOrdersListResponse,
  type WholesaleOrderSummaryRow,
} from "../_api";
import { getErrorMessage } from "@/lib/error-utils";
import { Factory, Mail, MapPin, Phone, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PaginationBar } from "@/components/shell/pagination-bar";
import { DashboardScrollWorkspace } from "@/components/shell/dashboard-scroll-workspace";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cardSectionClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ManufacturerWholesaleOrdersPage() {
  const [data, setData] = useState<ManufacturerWholesaleOrdersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ManufacturerWholesaleOrderDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<string>("pending");
  const [savingStatus, setSavingStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const st = statusFilter === "all" ? undefined : statusFilter;
      const res = await manufacturerApi.listWholesaleOrders(page, PAGE_SIZE, st);
      setData(res);
    } catch (e) {
      setError(getErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const openDetail = async (orderId: string) => {
    setSelectedId(orderId);
    setSheetOpen(true);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await manufacturerApi.getWholesaleOrderDetail(orderId);
      setDetail(res);
      setStatusDraft(res.order.status);
    } catch (e) {
      setDetailError(getErrorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const saveStatus = async () => {
    if (!selectedId || !detail) return;
    setSavingStatus(true);
    try {
      const updated = await manufacturerApi.patchWholesaleOrderStatus(selectedId, statusDraft);
      setDetail((d) =>
        d
          ? {
              ...d,
              order: { ...d.order, ...updated },
            }
          : d,
      );
      toast.success("Status updated.");
      load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSavingStatus(false);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <DashboardScrollWorkspace
        header={
          <PageHeader
            title="Wholesale orders"
            description="Purchase requests from medical stores. Open a row to see line items and store contact details."
            icon={Factory}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor="status-filter">
                    Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter" className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => load()} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            }
          />
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-4">
          {error && !data ? (
            <Card className="shrink-0 border-destructive/40">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Could not load orders</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={() => load()}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {loading && !data && !error ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Loader title="Loading wholesale orders" description="Fetching incoming orders…" />
            </div>
          ) : null}

          {data ? (
            <Card
              className={cn(
                cardSectionClass(loading ? "opacity-60" : ""),
                "flex min-h-0 flex-1 flex-col overflow-hidden",
              )}
            >
              <CardHeader className="shrink-0">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Incoming orders</CardTitle>
                    <CardDescription>
                      {data.total === 0
                        ? "No wholesale orders yet."
                        : `Showing ${data.items.length} of ${data.total} order${data.total === 1 ? "" : "s"}.`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                {data.items.length === 0 ? (
                  <p className="shrink-0 text-sm text-muted-foreground">
                    When a medical store places a wholesale order, it will appear here.
                  </p>
                ) : (
                  <>
                    <div className="-mx-4 min-h-0 flex-1 overflow-auto sm:mx-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold">Medical store</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="text-right font-semibold">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.items.map((row: WholesaleOrderSummaryRow) => (
                            <TableRow
                              key={row.id}
                              className="cursor-pointer"
                              onClick={() => openDetail(row.id)}
                            >
                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {format(new Date(row.createdAt), "MMM d, yyyy HH:mm")}
                              </TableCell>
                              <TableCell className="font-medium">{row.medicalStoreName ?? "—"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-normal capitalize">
                                  {row.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.currency} {row.total}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <PaginationBar
                      className="shrink-0"
                      page={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      disabled={loading}
                      summary={<span className="text-muted-foreground">Page {page} of {totalPages}</span>}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </DashboardScrollWorkspace>

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) {
            setSelectedId(null);
            setDetail(null);
          }
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Order detail</SheetTitle>
            <SheetDescription>
              {selectedId ? `Order ${selectedId.slice(0, 8)}…` : "Wholesale order"}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-6 px-4 pb-8 pt-2">
            {detailLoading ? (
              <Loader title="Loading order" description="Fetching line items…" />
            ) : null}
            {detailError ? <p className="text-sm text-destructive">{detailError}</p> : null}
            {detail ? (
              <>
                <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Status</p>
                    <Badge className="capitalize">{detail.order.status}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Placed {format(new Date(detail.order.createdAt), "MMM d, yyyy HH:mm")}
                  </p>
                  <p className="text-sm">
                    Total{" "}
                    <span className="font-semibold tabular-nums">
                      {detail.order.currency} {detail.order.total}
                    </span>
                  </p>
                  {detail.order.notes ? (
                    <p className="text-sm">
                      <span className="font-medium">Store notes:</span> {detail.order.notes}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-end">
                    <div className="grid w-full gap-1.5 sm:max-w-[220px]">
                      <Label htmlFor="status-next">Update status</Label>
                      <Select value={statusDraft} onValueChange={setStatusDraft}>
                        <SelectTrigger id="status-next">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="fulfilled">Fulfilled</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={savingStatus || statusDraft === detail.order.status}
                      onClick={saveStatus}
                    >
                      {savingStatus ? "Saving…" : "Save status"}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Medical store</h3>
                  <div className="space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium">{detail.medicalStore.storeName}</p>
                    <p className="text-muted-foreground flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {detail.medicalStore.addressLine}, {detail.medicalStore.city}
                        {detail.medicalStore.province ? `, ${detail.medicalStore.province}` : ""}
                        {detail.medicalStore.postalCode ? ` ${detail.medicalStore.postalCode}` : ""} ·{" "}
                        {detail.medicalStore.country}
                      </span>
                    </p>
                    {detail.medicalStore.phone ? (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        <a href={`tel:${detail.medicalStore.phone}`} className="text-primary underline-offset-4 hover:underline">
                          {detail.medicalStore.phone}
                        </a>
                      </p>
                    ) : null}
                    {detail.medicalStore.email ? (
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0" />
                        <a
                          href={`mailto:${detail.medicalStore.email}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {detail.medicalStore.email}
                        </a>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Line items</h3>
                  <div className="rounded-md border border-border/80">
                    <Table className="min-w-[480px]">
                      <TableHeader className="[&_th]:bg-muted/50">
                        <TableRow className="border-b hover:bg-transparent">
                          <TableHead className="font-medium">Product</TableHead>
                          <TableHead className="text-right font-medium">Qty</TableHead>
                          <TableHead className="text-right font-medium">Unit</TableHead>
                          <TableHead className="text-right font-medium">Line</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.items.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>
                              <div className="max-w-[220px] font-medium leading-snug">{line.medicineName}</div>
                              <div className="text-muted-foreground text-xs">MOQ at order: {line.moqSnapshot}</div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {detail.order.currency} {line.unitPrice}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {detail.order.currency} {line.lineTotal}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
