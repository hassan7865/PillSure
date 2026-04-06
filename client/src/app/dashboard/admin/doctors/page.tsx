"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "../_components/_api";
import { PaginatedDoctors, Doctor } from "../_components/_types";
import EmptyState from "@/components/ui/empty-state";
import { Search, Stethoscope, User } from "lucide-react";
import Image from "next/image";
import { PageHeader } from "@/components/shell/page-header";
import { PaginationBar } from "@/components/shell/pagination-bar";
import { DashboardScrollWorkspace } from "@/components/shell/dashboard-scroll-workspace";
import { ListingPanel } from "@/components/shell/listing-panel";

export default function AdminDoctorsPage() {
  const [data, setData] = useState<PaginatedDoctors | null>(null);
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

  const fetchDoctors = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await adminApi.getDoctors(page, limit, debouncedSearch);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch doctors"));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    void fetchDoctors();
  }, [fetchDoctors]);

  const doctors = data?.doctors || [];
  const pagination = data?.pagination;
  const initialLoading = isLoading && !data;
  const initialError = error && !data;

  return (
    <DashboardScrollWorkspace
      header={
        <PageHeader
          title="Doctors"
          description="Manage and view all doctors in the system"
          icon={Stethoscope}
        />
      }
    >
      <ListingPanel
        listTitle="All Doctors"
        listDescription={
          pagination ? `${pagination.total || 0} doctor${pagination.total !== 1 ? "s" : ""} found` : undefined
        }
        toolbarEnd={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search doctors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10"
            />
          </div>
        }
        isLoading={initialLoading}
        loadingTitle="Loading Doctors"
        loadingDescription="Fetching doctor data..."
        error={initialError ? error : null}
        onRetry={initialError ? fetchDoctors : undefined}
        isEmpty={!initialLoading && !initialError && doctors.length === 0}
        empty={
          <EmptyState
            type="search"
            title="No Doctors Found"
            description={
              debouncedSearch ? "Try adjusting your search terms" : "Doctors will appear here once added"
            }
            icon={<Stethoscope className="h-12 w-12 text-muted-foreground" />}
          />
        }
        footer={
          pagination && doctors.length > 0 ? (
            <PaginationBar
              page={page}
              totalPages={Math.max(1, pagination.totalPages)}
              onPageChange={setPage}
              disabled={isLoading}
              summary={
                pagination.total > 0 ? (
                  <>
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of{" "}
                    {pagination.total} doctors
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
              <TableHead className="font-semibold">Profile</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="hidden font-semibold md:table-cell">Email</TableHead>
              <TableHead className="font-semibold">Mobile</TableHead>
              <TableHead className="hidden font-semibold lg:table-cell">Experience</TableHead>
              <TableHead className="hidden font-semibold sm:table-cell">Hospital</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.map((doctor: Doctor) => (
              <TableRow key={doctor.id}>
                <TableCell>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-gradient-to-br from-primary to-primary/80 sm:h-12 sm:w-12">
                    {doctor.image ? (
                      <Image
                        src={doctor.image}
                        alt={`${doctor.firstName} ${doctor.lastName}`}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium sm:text-base">
                    {doctor.firstName} {doctor.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">{doctor.gender}</div>
                  <div className="mt-1 text-xs text-muted-foreground md:hidden">{doctor.email}</div>
                </TableCell>
                <TableCell className="hidden text-xs sm:text-sm md:table-cell">{doctor.email}</TableCell>
                <TableCell className="text-xs sm:text-sm">{doctor.mobile}</TableCell>
                <TableCell className="hidden text-xs sm:text-sm lg:table-cell">
                  {doctor.experienceYears} year{doctor.experienceYears !== 1 ? "s" : ""}
                </TableCell>
                <TableCell className="hidden text-xs sm:text-sm sm:table-cell">
                  {doctor.hospitalName || <span className="text-muted-foreground">Not assigned</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={doctor.isActive ? "default" : "outline"} className="text-xs">
                    {doctor.isActive ? "Active" : "Inactive"}
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
