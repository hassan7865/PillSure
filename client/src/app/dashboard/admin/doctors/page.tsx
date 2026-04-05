"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "../_components/_api";
import { PaginatedDoctors, Doctor } from "../_components/_types";
import Loader from "@/components/ui/loader";
import EmptyState from "@/components/ui/empty-state";
import { Search, Stethoscope, User } from "lucide-react";
import Image from "next/image";
import { PageHeader } from "@/components/shell/page-header";
import { PaginationBar } from "@/components/shell/pagination-bar";
import { DashboardScrollWorkspace } from "@/components/shell/dashboard-scroll-workspace";
import { cardSectionClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    let isMounted = true;

    const fetchDoctors = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await adminApi.getDoctors(page, limit, debouncedSearch);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch doctors"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDoctors();

    return () => {
      isMounted = false;
    };
  }, [page, limit, debouncedSearch]);

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader title="Loading Doctors" description="Fetching doctor data..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-medium text-foreground">Failed to load doctors</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const doctors = data?.doctors || [];
  const pagination = data?.pagination;

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
      <Card className={cn(cardSectionClass(), "flex h-full min-h-0 flex-col overflow-hidden")}>
        <CardHeader className="shrink-0 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl">All Doctors</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {pagination?.total || 0} doctor{pagination?.total !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search doctors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
          {doctors.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <EmptyState
                type="search"
                title="No Doctors Found"
                description={
                  debouncedSearch
                    ? "Try adjusting your search terms"
                    : "Doctors will appear here once added"
                }
                icon={<Stethoscope className="h-12 w-12 text-muted-foreground" />}
              />
            </div>
          ) : (
            <>
              <div className="-mx-4 min-h-0 flex-1 overflow-auto sm:mx-0">
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
                          <div className="font-medium text-sm sm:text-base">
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
                          {doctor.hospitalName || (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
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
              </div>

              {pagination ? (
                <PaginationBar
                  className="mt-4 shrink-0"
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
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </DashboardScrollWorkspace>
  );
}
