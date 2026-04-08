"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/shell/app-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import medicalStoreApi, { type MedicalStoreCategory } from "./_api";
import { getErrorMessage } from "@/lib/error-utils";
import { FolderOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { DashboardScrollWorkspace } from "@/components/shell/dashboard-scroll-workspace";
import { cardSectionClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

type StoreCategoriesCardProps = {
  onCategoriesChanged?: () => void;
};

export function StoreCategoriesCard({ onCategoriesChanged }: StoreCategoriesCardProps) {
  const [items, setItems] = useState<MedicalStoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<MedicalStoreCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteRow, setDeleteRow] = useState<MedicalStoreCategory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await medicalStoreApi.listCategories();
      setItems(rows);
    } catch (e) {
      setError(getErrorMessage(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setFormError("Enter a category name.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await medicalStoreApi.createCategory({ name });
      setCreateOpen(false);
      setNewName("");
      await load();
      onCategoriesChanged?.();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editRow) return;
    const name = editName.trim();
    if (!name) {
      setFormError("Enter a category name.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await medicalStoreApi.updateCategory(editRow.id, { name });
      setEditRow(null);
      await load();
      onCategoriesChanged?.();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await medicalStoreApi.deleteCategory(deleteRow.id);
      setDeleteRow(null);
      await load();
      onCategoriesChanged?.();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DashboardScrollWorkspace
        header={
          <PageHeader
            title="Store categories"
            description={
              <>
                Organize your storefront into shelf categories. Assign one or more when you edit each listing on{" "}
                <Link href="/dashboard/medical-store/listings">Manage listings</Link>.
              </>
            }
            icon={FolderOpen}
            action={
              <Button type="button" size="sm" className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New category
              </Button>
            }
          />
        }
      >
        <Card className={cn(cardSectionClass(), "flex h-full min-h-0 flex-col overflow-hidden")}>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6 pt-6">
            {error ? <p className="shrink-0 text-sm text-destructive">{error}</p> : null}
            {loading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="shrink-0 py-4 text-sm text-muted-foreground">
                No categories yet. Add one to organize your catalog.
              </p>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditRow(c);
                                setEditName(c.name);
                                setFormError(null);
                              }}
                              aria-label="Rename"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                setDeleteRow(c);
                                setFormError(null);
                              }}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </DashboardScrollWorkspace>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <AppDialogContent showCloseButton size="sm" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Pain relief"
            />
            {formError && createOpen ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter className="mt-4 border-t border-border/60 pt-3">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </AppDialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <AppDialogContent showCloseButton size="sm" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cat-edit-name">Name</Label>
            <Input id="cat-edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            {formError && editRow ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter className="mt-4 border-t border-border/60 pt-3">
            <Button type="button" variant="outline" onClick={() => setEditRow(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </AppDialogContent>
      </Dialog>

      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AppDialogContent showCloseButton size="sm" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Listings will simply lose this label; medicines stay in your catalog.
          </p>
          {formError && deleteRow ? <p className="text-sm text-destructive">{formError}</p> : null}
          <DialogFooter className="mt-4 border-t border-border/60 pt-3">
            <Button type="button" variant="outline" onClick={() => setDeleteRow(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </AppDialogContent>
      </Dialog>
    </>
  );
}
