"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminApi } from "../_components/_api";
import { PaginatedDrugCategories, DrugCategory } from "../_components/_types";
import Loader from "@/components/ui/loader";
import EmptyState from "@/components/ui/empty-state";
import { Search, ChevronLeft, ChevronRight, Layers, Plus, Pencil, Trash2, Link2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import DrugCategoryFormDialog from "../_components/DrugCategoryFormDialog";
import DrugCategoryMappingDialog from "../_components/DrugCategoryMappingDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";

export default function AdminCategoriesPage() {
  const { showSuccess, showError } = useCustomToast();
  const [data, setData] = useState<PaginatedDrugCategories | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DrugCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DrugCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mappingCategory, setMappingCategory] = useState<DrugCategory | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const closeMappingDialog = useCallback(() => {
    setMappingCategory(null);
  }, []);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.getDrugCategories(page, limit, debouncedSearch);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch categories"));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const openEdit = (c: DrugCategory) => {
    setEditingCategory(c);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteDrugCategory(deleteTarget.id);
      showSuccess("Category deleted", `"${deleteTarget.name}" was removed.`);
      setDeleteTarget(null);
      await fetchCategories();
    } catch (err) {
      showError("Could not delete category", getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader title="Loading Categories" description="Fetching medicine categories..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-medium text-foreground">Failed to load categories</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const categories = data?.categories ?? [];
  const pagination = data?.pagination;

  return (
    <>
      <div className="flex flex-1 flex-col space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
              <Layers className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              Categories
            </h2>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Manage medicine categories and link them to doctor specializations
            </p>
          </div>
          <Button onClick={openCreate} className="w-full shrink-0 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New category
          </Button>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl">All Categories</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {pagination?.total ?? 0} categor{pagination?.total !== 1 ? "ies" : "y"} found
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {categories.length === 0 ? (
              <EmptyState
                type="search"
                title="No Categories Found"
                description={
                  debouncedSearch
                    ? "Try adjusting your search terms"
                    : "Create a category to classify medicines"
                }
                icon={<Layers className="h-12 w-12 text-muted-foreground" />}
              />
            ) : (
              <>
                <div className="-mx-4 overflow-x-auto sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-left text-xs font-semibold sm:p-3 sm:text-sm">
                            Category
                          </th>
                          <th className="w-[1%] whitespace-nowrap p-2 text-right text-xs font-semibold sm:p-3 sm:text-sm">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((c) => (
                          <tr
                            key={c.id}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <td className="min-w-0 p-2 sm:p-3">
                              <div className="truncate text-sm font-medium sm:text-base">{c.name}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">ID {c.id}</div>
                            </td>
                            <td className="p-2 text-right align-middle sm:p-3">
                              <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 shrink-0 px-2 md:px-3"
                                  onClick={() => setMappingCategory(c)}
                                  title="Mapping"
                                  aria-label="Open specialization mapping"
                                >
                                  <Link2 className="h-3.5 w-3.5 md:mr-1.5" />
                                  <span className="hidden md:inline">Mapping</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 shrink-0 px-2 md:px-3"
                                  onClick={() => openEdit(c)}
                                  title="Edit"
                                  aria-label="Edit category"
                                >
                                  <Pencil className="h-3.5 w-3.5 md:mr-1.5" />
                                  <span className="hidden md:inline">Edit</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 shrink-0 px-2 md:px-3"
                                  onClick={() => setDeleteTarget(c)}
                                  title="Delete"
                                  aria-label="Delete category"
                                >
                                  <Trash2 className="h-3.5 w-3.5 md:mr-1.5" />
                                  <span className="hidden md:inline">Delete</span>
                                </Button>
                              </div>
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
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)}{" "}
                        of {pagination.total} categories
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={!pagination.hasPrevPage || isLoading}
                          className="text-xs sm:text-sm"
                        >
                          <ChevronLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Previous</span>
                          <span className="sm:hidden">Prev</span>
                        </Button>
                        <div className="px-2 text-xs text-muted-foreground sm:text-sm">
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
                          <ChevronRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
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

      <DrugCategoryFormDialog
        open={formOpen}
        onClose={closeForm}
        category={editingCategory}
        onSaved={fetchCategories}
      />

      <DrugCategoryMappingDialog
        open={mappingCategory != null}
        onClose={closeMappingDialog}
        category={mappingCategory}
      />

      <Dialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  This will remove <span className="font-medium text-foreground">{deleteTarget.name}</span>.
                  Medicines using this category will have their category cleared. Mappings to doctor
                  specializations for this category will be removed.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
