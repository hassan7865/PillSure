"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "../_components/_api";
import { PaginatedClinics, Clinic } from "../_components/_types";
import EmptyState from "@/components/ui/empty-state";
import { Search, HeartPulse } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PaginationBar } from "@/components/shell/pagination-bar";
import { DashboardScrollWorkspace } from "@/components/shell/dashboard-scroll-workspace";
import { ListingPanel } from "@/components/shell/listing-panel";

export default function AdminClinicsPage() {
  const [data, setData] = useState<PaginatedClinics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchClinics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await adminApi.getClinics(page, limit, debouncedSearch);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch clinics"));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    void fetchClinics();
  }, [fetchClinics]);

  const clinics = data?.clinics || [];
  const pagination = data?.pagination;
  const initialLoading = isLoading && !data;
  const initialError = error && !data;

  return (
    <DashboardScrollWorkspace
      header={
        <PageHeader
          title="Clinics"
          description="Manage and view all clinics in the system"
          icon={HeartPulse}
        />
      }
    >
      <ListingPanel
        listTitle="All Clinics"
        listDescription={
          pagination ? `${pagination.total || 0} clinic${pagination.total !== 1 ? "s" : ""} found` : undefined
        }
        toolbarEnd={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clinics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10"
            />
          </div>
        }
        isLoading={initialLoading}
        loadingTitle="Loading Clinics"
        loadingDescription="Fetching clinic data..."
        error={initialError ? error : null}
        onRetry={initialError ? fetchClinics : undefined}
        isEmpty={!initialLoading && !initialError && clinics.length === 0}
        empty={
          <EmptyState
            type="search"
            title="No Clinics Found"
            description={
              debouncedSearch ? "Try adjusting your search terms" : "Clinics will appear here once added"
            }
            icon={<HeartPulse className="h-12 w-12 text-muted-foreground" />}
          />
        }
        footer={
          pagination && clinics.length > 0 ? (
            <PaginationBar
              page={page}
              totalPages={Math.max(1, pagination.totalPages)}
              onPageChange={setPage}
              disabled={isLoading}
              summary={
                pagination.total > 0 ? (
                  <>
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of{" "}
                    {pagination.total} clinics
                  </>
                ) : undefined
              }
            />
          ) : null
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Clinic Name</TableHead>
              <TableHead className="hidden font-semibold md:table-cell">Admin</TableHead>
              <TableHead className="hidden font-semibold lg:table-cell">Email</TableHead>
              <TableHead className="hidden font-semibold sm:table-cell">Contact</TableHead>
              <TableHead className="hidden font-semibold xl:table-cell">License No</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clinics.map((clinic: Clinic) => (
              <TableRow key={clinic.id}>
                <TableCell>
                  <div className="max-w-xs text-sm font-medium sm:text-base">{clinic.clinicName}</div>
                  <div className="truncate text-xs text-muted-foreground">{clinic.clinicAddress}</div>
                  <div className="mt-1 text-xs text-muted-foreground md:hidden">Admin: {clinic.adminName}</div>
                </TableCell>
                <TableCell className="hidden text-xs sm:text-sm md:table-cell">
                  {clinic.adminName}
                  <div className="text-xs text-muted-foreground">
                    {clinic.userFirstName} {clinic.userLastName}
                  </div>
                </TableCell>
                <TableCell className="hidden text-xs sm:text-sm lg:table-cell">{clinic.clinicEmail}</TableCell>
                <TableCell className="hidden text-xs sm:text-sm sm:table-cell">
                  {clinic.clinicContactNo}
                </TableCell>
                <TableCell className="hidden text-xs sm:text-sm xl:table-cell">{clinic.licenseNo}</TableCell>
                <TableCell>
                  <Badge variant={clinic.isActive ? "default" : "outline"} className="text-xs">
                    {clinic.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListingPanel>
    </DashboardScrollWorkspace>
  );
}
