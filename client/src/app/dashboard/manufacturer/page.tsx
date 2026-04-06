"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Factory, Upload, Package, Boxes, RefreshCw, Search, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PaginationBar } from "@/components/shell/pagination-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cardSectionClass } from "@/lib/dashboard-ui";
import { DashboardScrollWorkspace } from "@/components/shell/dashboard-scroll-workspace";
import { InlineError } from "@/components/shell/inline-error";
import { ListingPanel } from "@/components/shell/listing-panel";
import { cn } from "@/lib/utils";
import Loader from "@/components/ui/loader";
import { manufacturerApi, type ManufacturerListingRow, type ManufacturerListResponse } from "./_api";
import { ManufacturerBulkImportDialog } from "./bulk-import-dialog";
import { ManufacturerEditListingDialog } from "./edit-listing-dialog";
import { getErrorMessage } from "@/lib/error-utils";

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 350;

export default function ManufacturerDashboardPage() {
  const [data, setData] = useState<ManufacturerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<ManufacturerListingRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = useCallback(async (p: number, q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await manufacturerApi.listMedicines(p, PAGE_SIZE, q || undefined);
      setData(res);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, debouncedSearch);
  }, [load, page, debouncedSearch]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const openEdit = (row: ManufacturerListingRow) => {
    setEditRow(row);
    setEditOpen(true);
  };

  return (
    <>
      <DashboardScrollWorkspace
        bodyClassName="overflow-y-auto"
        header={
          <PageHeader
            title="Manufacturer dashboard"
            description="Your live listings on PillSure: wholesale terms and quantities. Bulk import updates existing rows when the medicine name matches a product already on your list."
            icon={Factory}
            variant="dashboard"
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => load(page, debouncedSearch)} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button type="button" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Bulk import (Excel)
                </Button>
              </div>
            }
          />
        }
      >
        <div className="flex min-h-0 flex-col gap-4 pb-4">
          {error && !data ? (
            <InlineError title="Could not load listings" message={error} onRetry={() => load(page, debouncedSearch)} />
          ) : null}

          {loading && !data && !error ? (
            <div className="flex min-h-[240px] flex-1 items-center justify-center">
              <Loader title="Loading listings" description="Fetching your medicine catalog…" />
            </div>
          ) : null}

          {data ? (
            <>
              {error ? (
                <div className="shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                  {error}
                </div>
              ) : null}
              <div className={cn("grid shrink-0 gap-4 sm:grid-cols-3", loading && "opacity-60")}>
                <Card className={cardSectionClass()}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">SKU listings</CardTitle>
                    <Package className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.stats.totalListings}</div>
                    <p className="text-muted-foreground text-xs">Rows in your manufacturer catalog</p>
                  </CardContent>
                </Card>
                <Card className={cardSectionClass()}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active listings</CardTitle>
                    <Factory className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.stats.activeListings}</div>
                    <p className="text-muted-foreground text-xs">Currently visible to buyers</p>
                  </CardContent>
                </Card>
                <Card className={cardSectionClass()}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total listed units</CardTitle>
                    <Boxes className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.stats.totalListedUnits.toLocaleString()}</div>
                    <p className="text-muted-foreground text-xs">Sum of listed quantity across SKUs</p>
                  </CardContent>
                </Card>
              </div>

              <ListingPanel
                cardClassName={cn("min-h-[560px]", loading && "opacity-60")}
                listTitle="Listed medicines"
                listDescription={
                  data.total === 0
                    ? debouncedSearch
                      ? `No medicines match “${debouncedSearch}”.`
                      : "No listings yet — use bulk import to add your first rows."
                    : `Showing ${data.items.length} of ${data.total} listing${data.total === 1 ? "" : "s"}.`
                }
                toolbarEnd={
                  <div className="relative w-full sm:max-w-xs">
                    <Search
                      className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                      aria-hidden
                    />
                    <Input
                      placeholder="Search by medicine name…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-9"
                      aria-label="Search medicines"
                    />
                  </div>
                }
                isEmpty={data.items.length === 0}
                empty={
                  <div className="text-muted-foreground flex flex-col items-center justify-center gap-4 py-12 text-center text-sm">
                    <Package className="h-10 w-10 opacity-40" />
                    <p>{debouncedSearch ? "Try a different search." : "No medicines listed yet."}</p>
                    {!debouncedSearch ? (
                      <Button type="button" onClick={() => setImportOpen(true)}>
                        Import from Excel
                      </Button>
                    ) : null}
                  </div>
                }
                footer={
                  data.items.length > 0 ? (
                    <PaginationBar
                      page={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      disabled={loading}
                      summary={<span className="text-muted-foreground">Page {page} of {totalPages}</span>}
                    />
                  ) : null
                }
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Medicine</TableHead>
                      <TableHead className="text-right font-semibold">
                        Wholesale ({data.items[0]?.currency ?? "PKR"})
                      </TableHead>
                      <TableHead className="text-right font-semibold">MOQ</TableHead>
                      <TableHead className="text-right font-semibold">Listed qty</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Updated</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((row: ManufacturerListingRow) => (
                      <TableRow key={row.listingId}>
                        <TableCell>
                          <div className="max-w-[220px] font-medium leading-snug">{row.medicineName}</div>
                          <div className="text-xs text-muted-foreground">ID {row.medicineId}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.wholesalePrice}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.moq}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.listedQuantity.toLocaleString()}</TableCell>
                        <TableCell>
                          {row.isActive ? (
                            <Badge variant="secondary" className="font-normal">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="font-normal">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {format(new Date(row.updatedAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => openEdit(row)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ListingPanel>
            </>
          ) : null}
        </div>
      </DashboardScrollWorkspace>

      <ManufacturerBulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => load(page, debouncedSearch)}
      />

      <ManufacturerEditListingDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        row={editRow}
        onSaved={() => load(page, debouncedSearch)}
      />
    </>
  );
}
