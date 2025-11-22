"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "../_components/_api";
import { PaginatedMedicines, Medicine } from "../_components/_types";
import Loader from "@/components/ui/loader";
import EmptyState from "@/components/ui/empty-state";
import { Search, ChevronLeft, ChevronRight, Pill, Edit } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import EditMedicineDialog from "../_components/EditMedicineDialog";

export default function AdminMedicinesPage() {
  const [data, setData] = useState<PaginatedMedicines | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let isMounted = true;

    const fetchMedicines = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await adminApi.getMedicines(page, limit, debouncedSearch);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch medicines"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMedicines();

    return () => {
      isMounted = false;
    };
  }, [page, limit, debouncedSearch]);

  const handleEdit = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setSelectedMedicine(null);
  };

  const handleRefresh = async () => {
    // Refresh the medicines list after update
    try {
      const result = await adminApi.getMedicines(page, limit, debouncedSearch);
      setData(result);
    } catch (err) {
      // Silently fail, error is handled in dialog
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader title="Loading Medicines" description="Fetching medicine data..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground mb-2">Failed to load medicines</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const medicines = data?.medicines || [];
  const pagination = data?.pagination;

  return (
    <>
      <div className="flex flex-1 flex-col space-y-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Pill className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Medicines
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage and view all medicines in the system
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">All Medicines</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {pagination?.total || 0} medicine{pagination?.total !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search medicines..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {medicines.length === 0 ? (
              <EmptyState
                type="search"
                title="No Medicines Found"
                description={
                  debouncedSearch
                    ? "Try adjusting your search terms"
                    : "Medicines will appear here once added"
                }
                icon={<Pill className="w-12 h-12 text-muted-foreground" />}
              />
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm">Medicine Name</th>
                          <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm hidden md:table-cell">Category</th>
                          <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm">Price</th>
                          <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm hidden lg:table-cell">Discount</th>
                          <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm">Stock</th>
                          <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm hidden sm:table-cell">Prescription</th>
                          <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicines.map((medicine: Medicine) => (
                          <tr key={medicine.id} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="p-2 sm:p-3">
                              <div className="font-medium text-sm sm:text-base">{medicine.medicineName}</div>
                              {medicine.drugVarient && (
                                <div className="text-xs text-muted-foreground">{medicine.drugVarient}</div>
                              )}
                              <div className="text-xs text-muted-foreground md:hidden mt-1">
                                {medicine.drugCategory || "N/A"}
                              </div>
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                              {medicine.drugCategory || (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm">
                              {medicine.price ? `PKR ${medicine.price}` : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm hidden lg:table-cell">
                              {medicine.discount ? `${medicine.discount}%` : (
                                <span className="text-muted-foreground">No discount</span>
                              )}
                            </td>
                            <td className="p-2 sm:p-3">
                              {medicine.stock !== null ? (
                                <Badge variant={medicine.stock > 0 ? "default" : "destructive"} className="text-xs">
                                  {medicine.stock} in stock
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </td>
                            <td className="p-2 sm:p-3 hidden sm:table-cell">
                              <Badge variant={medicine.prescriptionRequired ? "outline" : "secondary"} className="text-xs">
                                {medicine.prescriptionRequired ? "Required" : "Not Required"}
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(medicine)}
                                className="h-7 sm:h-8 text-xs sm:text-sm"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of{" "}
                        {pagination.total} medicines
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={!pagination.hasPrevPage || isLoading}
                          className="text-xs sm:text-sm"
                        >
                          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">Previous</span>
                          <span className="sm:hidden">Prev</span>
                        </Button>
                        <div className="text-xs sm:text-sm text-muted-foreground px-2">
                          Page {page} of {pagination.totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page + 1)}
                          disabled={!pagination.hasNextPage || isLoading}
                          className="text-xs sm:text-sm"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <span className="sm:hidden">Next</span>
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Medicine Dialog */}
      <EditMedicineDialog
        open={editDialogOpen}
        onClose={handleCloseDialog}
        medicine={selectedMedicine}
        onUpdate={handleRefresh}
      />
    </>
  );
}

