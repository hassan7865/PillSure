"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import medicalStoreApi, {
  type CreateMedicalStoreListingBody,
  type MedicalStoreCatalogRow,
  type MedicalStoreCategory,
  type UpdateMedicalStoreListingBody,
} from "./_api";
import { medicineApi, type Medicine, type ManufacturerOption } from "@/app/medicine/_api";
import { getErrorMessage } from "@/lib/error-utils";
import { MedicineRxStamp } from "@/components/medicine/medicine-catalog-parts";
import { Camera, Loader2, Pencil, Plus, Search, Trash2, ChevronLeft, ChevronRight, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PackImageItem = { url: string; file?: File; isNew?: boolean };

export type FaqDraft = { question: string; answer: string };

const MAX_PACK_IMAGES = 4;

function normalizeFaqsForApi(
  rows: FaqDraft[],
): { ok: true; value: FaqDraft[] | null } | { ok: false; message: string } {
  const incomplete = rows.some(
    (r) =>
      (r.question.trim().length > 0 && r.answer.trim().length === 0) ||
      (r.question.trim().length === 0 && r.answer.trim().length > 0),
  );
  if (incomplete) {
    return {
      ok: false,
      message: "Each FAQ needs both a question and an answer, or remove that row.",
    };
  }
  const done = rows
    .map((r) => ({ question: r.question.trim(), answer: r.answer.trim() }))
    .filter((r) => r.question.length > 0 && r.answer.length > 0);
  return { ok: true, value: done.length ? done : null };
}

function ListingFaqEditor({
  items,
  onChange,
  disabled,
  idPrefix,
}: {
  items: FaqDraft[];
  onChange: (next: FaqDraft[]) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const update = (index: number, field: keyof FaqDraft, value: string) => {
    onChange(items.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { question: "", answer: "" }]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex gap-2">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">Frequently asked questions</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional. Short Q&amp;A for shoppers—separate from the long description.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={add} disabled={disabled}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add question
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
          No questions yet. Click &quot;Add question&quot; to add FAQs for this listing.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((row, index) => (
            <li
              key={`${idPrefix}-faq-${index}`}
              className="rounded-lg border border-border/80 bg-background p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Question {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  aria-label="Remove FAQ"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-faq-q-${index}`} className="text-xs">
                  Question
                </Label>
                <Input
                  id={`${idPrefix}-faq-q-${index}`}
                  value={row.question}
                  onChange={(e) => update(index, "question", e.target.value)}
                  placeholder="e.g. How should I store this?"
                  disabled={disabled}
                />
                <Label htmlFor={`${idPrefix}-faq-a-${index}`} className="text-xs">
                  Answer
                </Label>
                <Textarea
                  id={`${idPrefix}-faq-a-${index}`}
                  value={row.answer}
                  onChange={(e) => update(index, "answer", e.target.value)}
                  placeholder="Your answer for customers…"
                  rows={3}
                  disabled={disabled}
                  className="resize-y min-h-[72px]"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PackImagesField({
  idPrefix,
  items,
  onAddFiles,
  onRemove,
  disabled,
}: {
  idPrefix: string;
  items: PackImageItem[];
  onAddFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}) {
  const remaining = MAX_PACK_IMAGES - items.length;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${idPrefix}-pack`} className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          Pack photos (optional)
        </Label>
        <span className="text-xs text-muted-foreground">
          {items.length} / {MAX_PACK_IMAGES}
        </span>
      </div>
      {remaining > 0 ? (
        <div>
          <Input
            id={`${idPrefix}-pack`}
            type="file"
            accept="image/*"
            multiple
            disabled={disabled || items.length >= MAX_PACK_IMAGES}
            className="cursor-pointer"
            onChange={(e) => {
              onAddFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP · max 5MB each</p>
        </div>
      ) : null}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((img, index) => (
            <div
              key={`${img.url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border-2 border-border bg-muted/50"
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onRemove(index)}
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type ManageListingsTabProps = {
  rows: MedicalStoreCatalogRow[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  total: number;
  catalogLoading: boolean;
  onPageChange: (p: number) => void;
  onRefresh: () => void;
  categoryRefreshKey?: number;
  compactCatalogHeader?: boolean;
};

export function ManageListingsTab({
  rows,
  loading,
  error,
  page,
  totalPages,
  total,
  catalogLoading,
  onPageChange,
  onRefresh,
  categoryRefreshKey = 0,
  compactCatalogHeader = false,
}: ManageListingsTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<MedicalStoreCatalogRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<MedicalStoreCatalogRow | null>(null);

  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);
  const [manufacturerFilterId, setManufacturerFilterId] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [retailPrice, setRetailPrice] = useState("");
  const [listedQty, setListedQty] = useState("0");
  const [packImagesAdd, setPackImagesAdd] = useState<PackImageItem[]>([]);
  const [editPackImages, setEditPackImages] = useState<PackImageItem[]>([]);
  const [resolvedManufacturerMedicineId, setResolvedManufacturerMedicineId] = useState<string | null>(null);
  const [batchLinkLoading, setBatchLinkLoading] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [storeCategories, setStoreCategories] = useState<MedicalStoreCategory[]>([]);
  const [selectedCategoryIdsAdd, setSelectedCategoryIdsAdd] = useState<string[]>([]);
  const [selectedCategoryIdsEdit, setSelectedCategoryIdsEdit] = useState<string[]>([]);
  const [drugDescriptionAdd, setDrugDescriptionAdd] = useState("");
  const [faqsAdd, setFaqsAdd] = useState<FaqDraft[]>([]);
  const [drugDescriptionEdit, setDrugDescriptionEdit] = useState("");
  const [faqsEdit, setFaqsEdit] = useState<FaqDraft[]>([]);

  useEffect(() => {
    let cancelled = false;
    medicineApi
      .listManufacturers()
      .then((list) => {
        if (!cancelled) setManufacturers(list);
      })
      .catch(() => {
        if (!cancelled) setManufacturers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedMedicine(null);
  }, [manufacturerFilterId]);

  useEffect(() => {
    let cancelled = false;
    medicalStoreApi
      .listCategories()
      .then((list) => {
        if (!cancelled) setStoreCategories(list);
      })
      .catch(() => {
        if (!cancelled) setStoreCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryRefreshKey]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ), 350);
    return () => clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    if (!debouncedQ.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    medicineApi
      .searchMedicines(debouncedQ, 20, manufacturerFilterId || undefined)
      .then((r) => {
        if (!cancelled) setSearchResults(r);
      })
      .catch(() => {
        if (!cancelled) setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, manufacturerFilterId]);

  useEffect(() => {
    if (!selectedMedicine || !manufacturerFilterId.trim()) {
      setResolvedManufacturerMedicineId(null);
      setBatchLinkLoading(false);
      return;
    }
    let cancelled = false;
    setBatchLinkLoading(true);
    medicineApi
      .resolveManufacturerBatch(selectedMedicine.id, manufacturerFilterId)
      .then((id) => {
        if (!cancelled) setResolvedManufacturerMedicineId(id);
      })
      .catch(() => {
        if (!cancelled) setResolvedManufacturerMedicineId(null);
      })
      .finally(() => {
        if (!cancelled) setBatchLinkLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMedicine, manufacturerFilterId]);

  const resetAddForm = useCallback(() => {
    setPackImagesAdd((prev) => {
      prev.forEach((img) => {
        if (img.isNew && img.url.startsWith("blob:")) URL.revokeObjectURL(img.url);
      });
      return [];
    });
    setSearchQ("");
    setDebouncedQ("");
    setSearchResults([]);
    setSelectedMedicine(null);
    setRetailPrice("");
    setListedQty("0");
    setResolvedManufacturerMedicineId(null);
    setBatchLinkLoading(false);
    setIsActive(true);
    setSortOrder("0");
    setManufacturerFilterId("");
    setSelectedCategoryIdsAdd([]);
    setDrugDescriptionAdd("");
    setFaqsAdd([]);
    setFormError(null);
  }, []);

  const openAdd = () => {
    resetAddForm();
    setSelectedCategoryIdsAdd([]);
    setAddOpen(true);
  };

  const openEdit = (row: MedicalStoreCatalogRow) => {
    setFormError(null);
    setEditRow(row);
    setRetailPrice(String(row.retailPrice));
    setListedQty(String(row.listedQuantity));
    setEditPackImages((row.packImages ?? []).map((url) => ({ url, isNew: false })));
    setIsActive(row.isActive);
    setSortOrder(String(row.sortOrder ?? 0));
    setSelectedCategoryIdsEdit(row.categories.map((c) => c.id));
    setDrugDescriptionEdit(row.drugDescription ?? "");
    setFaqsEdit(
      row.faqs?.length
        ? row.faqs.map((f) => ({ question: f.question ?? "", answer: f.answer ?? "" }))
        : [],
    );
  };

  const addPackFiles = (setItems: Dispatch<SetStateAction<PackImageItem[]>>, files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setFormError("Only image files are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFormError("Each image must be 5MB or smaller.");
        return;
      }
    }
    setItems((prev) => {
      const next = [...prev];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (next.length >= MAX_PACK_IMAGES) break;
        next.push({ url: URL.createObjectURL(file), file, isNew: true });
      }
      return next;
    });
    setFormError(null);
  };

  const removePackAt = (index: number, setItems: Dispatch<SetStateAction<PackImageItem[]>>) => {
    setItems((prev) => {
      const img = prev[index];
      if (img?.isNew && img.url.startsWith("blob:")) URL.revokeObjectURL(img.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    if (editRow) return;
    setEditPackImages((prev) => {
      prev.forEach((img) => {
        if (img.isNew && img.url.startsWith("blob:")) URL.revokeObjectURL(img.url);
      });
      return [];
    });
  }, [editRow]);

  const handleCreate = async () => {
    if (!selectedMedicine) {
      setFormError("Select a medicine from search results.");
      return;
    }
    const price = parseFloat(retailPrice);
    const qty = parseInt(listedQty, 10);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Enter a valid retail price.");
      return;
    }
    if (!Number.isInteger(qty) || qty < 0) {
      setFormError("Stock quantity must be a whole number ≥ 0.");
      return;
    }
    if (manufacturerFilterId.trim() && batchLinkLoading) {
      setFormError("Wait for the manufacturer batch link to finish loading.");
      return;
    }
    const mid: string | null = manufacturerFilterId.trim()
      ? resolvedManufacturerMedicineId
      : null;
    const faqNorm = normalizeFaqsForApi(faqsAdd);
    if (!faqNorm.ok) {
      setFormError(faqNorm.message);
      return;
    }
    const body: CreateMedicalStoreListingBody = {
      medicineId: selectedMedicine.id,
      retailPrice: price,
      listedQuantity: qty,
      manufacturerMedicineId: mid,
      isActive,
      sortOrder: parseInt(sortOrder, 10) || 0,
      categoryIds: selectedCategoryIdsAdd.length ? selectedCategoryIdsAdd : undefined,
      drugDescription: drugDescriptionAdd.trim() || null,
      faqs: faqNorm.value,
    };
    const newPackFiles = packImagesAdd.filter((x) => x.isNew && x.file).map((x) => x.file!);
    setSubmitting(true);
    setFormError(null);
    try {
      await medicalStoreApi.createListing(body, newPackFiles.length ? newPackFiles : undefined);
      setAddOpen(false);
      resetAddForm();
      onRefresh();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editRow) return;
    const price = parseFloat(retailPrice);
    const qty = parseInt(listedQty, 10);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Enter a valid retail price.");
      return;
    }
    if (!Number.isInteger(qty) || qty < 0) {
      setFormError("Stock quantity must be a whole number ≥ 0.");
      return;
    }
    const faqNorm = normalizeFaqsForApi(faqsEdit);
    if (!faqNorm.ok) {
      setFormError(faqNorm.message);
      return;
    }
    const body: UpdateMedicalStoreListingBody = {
      retailPrice: price,
      listedQuantity: qty,
      isActive,
      sortOrder: parseInt(sortOrder, 10) || 0,
      categoryIds: selectedCategoryIdsEdit,
      drugDescription: drugDescriptionEdit.trim() || null,
      faqs: faqNorm.value,
    };
    const origSorted = (editRow.packImages ?? []).slice().sort().join("|");
    const retainedUrls = editPackImages.filter((x) => !x.isNew).map((x) => x.url);
    const retainedSorted = retainedUrls.slice().sort().join("|");
    const newPackFiles = editPackImages.filter((x) => x.isNew && x.file).map((x) => x.file!);
    const imagesChanged = origSorted !== retainedSorted || newPackFiles.length > 0;

    setSubmitting(true);
    setFormError(null);
    try {
      if (imagesChanged) {
        await medicalStoreApi.updateListing(editRow.listingId, body, {
          packImageFiles: newPackFiles.length ? newPackFiles : undefined,
          existingPackImageUrls: retainedUrls,
        });
      } else {
        await medicalStoreApi.updateListing(editRow.listingId, body);
      }
      setEditRow(null);
      onRefresh();
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
      await medicalStoreApi.deleteListing(deleteRow.listingId);
      setDeleteRow(null);
      onRefresh();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const thClass =
    "sticky top-0 z-10 border-b border-border/60 bg-muted/95 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-muted/80";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="shrink-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {compactCatalogHeader ? (
            <CardDescription className="text-sm">
              <span className="font-medium text-foreground">{total}</span> listing{total === 1 ? "" : "s"} — add, edit,
              or remove products below
            </CardDescription>
          ) : (
            <div>
              <CardTitle className="text-lg">Your catalog</CardTitle>
              <CardDescription>Create, edit, or remove store listings ({total} total)</CardDescription>
            </div>
          )}
          <Button type="button" className="gap-2 shrink-0" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            List new medicine
          </Button>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6 pt-0">
          {error ? (
            <p className="shrink-0 text-sm text-destructive">{error}</p>
          ) : null}

          {loading && !rows.length ? (
            <div className="flex min-h-0 flex-1 items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/80">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={thClass}>Product</TableHead>
                    <TableHead className={thClass}>Price</TableHead>
                    <TableHead className={thClass}>Stock</TableHead>
                    <TableHead className={thClass}>Status</TableHead>
                    <TableHead className={cn(thClass, "hidden md:table-cell")}>Updated</TableHead>
                    <TableHead className={cn(thClass, "text-right")}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.listingId}>
                      <TableCell>
                        <div className="font-medium leading-snug">{row.medicineName}</div>
                        {row.categories?.length ? (
                          <div className="text-xs text-muted-foreground">
                            {row.categories.map((c) => c.name).join(" · ")}
                          </div>
                        ) : null}
                        {row.prescriptionRequired ? (
                          <span className="mt-1 inline-block">
                            <MedicineRxStamp className="text-[10px] py-px" />
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.currency}{" "}
                        {Number(row.retailPrice).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="tabular-nums">{row.listedQuantity}</TableCell>
                      <TableCell>
                        {row.isActive ? (
                          <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">Live</Badge>
                        ) : (
                          <Badge variant="secondary">Hidden</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {new Date(row.updatedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(row)}
                            aria-label="Edit listing"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setFormError(null);
                              setDeleteRow(row);
                            }}
                            aria-label="Remove listing"
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
          ) : null}

          {!loading && !error && rows.length === 0 ? (
            <p className="shrink-0 py-8 text-center text-sm text-muted-foreground">
              No listings yet. Add a medicine to get started.
            </p>
          ) : null}

          {totalPages > 1 ? (
            <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-border/60 pt-4">
              <p className="text-xs text-muted-foreground">
                Page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || catalogLoading}
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || catalogLoading}
                  onClick={() => onPageChange(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Add */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="max-h-[min(90vh,780px)] overflow-y-auto sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>List a new medicine</DialogTitle>
            <DialogDescription>Search the catalog, then set price and availability for your store.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ms-manufacturer">Manufacturer</Label>
              <Select
                value={manufacturerFilterId || "__all__"}
                onValueChange={(v) => setManufacturerFilterId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger id="ms-manufacturer" className="w-full max-w-full">
                  <SelectValue placeholder="All manufacturers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All manufacturers</SelectItem>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {(m.shortName && m.shortName.trim()) || m.legalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optional: limit search to that manufacturer&apos;s catalog. If you add a listing with a manufacturer
                selected, we link it to their wholesale batch automatically when one exists.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ms-search">Search medicines</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ms-search"
                  placeholder="e.g. Paracetamol"
                  className="pl-9"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
              </div>
              {debouncedQ.trim() && searchLoading ? (
                <p className="text-xs text-muted-foreground">Searching…</p>
              ) : null}
              {debouncedQ.trim() && !searchLoading && searchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground">No matches for that search.</p>
              ) : null}
              {searchResults.length > 0 ? (
                <ScrollArea className="max-h-[min(240px,40vh)] rounded-md border border-border/80">
                  <div className="space-y-1 p-2">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMedicine(m);
                          setFormError(null);
                        }}
                        className={`flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm transition hover:bg-muted ${
                          selectedMedicine?.id === m.id ? "bg-primary/10 ring-1 ring-primary/30" : ""
                        }`}
                      >
                        <span className="font-medium leading-snug">{m.medicineName}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : null}
              {selectedMedicine ? (
                <p className="text-xs text-primary">
                  Selected: <strong>{selectedMedicine.medicineName}</strong>
                </p>
              ) : null}
              {selectedMedicine && manufacturerFilterId ? (
                <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Wholesale batch link</span>
                  {batchLinkLoading ? (
                    <p className="mt-1">Looking up manufacturer batch…</p>
                  ) : resolvedManufacturerMedicineId ? (
                    <p className="mt-1">
                      Linked to{" "}
                      <span className="font-medium text-foreground">
                        {(manufacturers.find((x) => x.id === manufacturerFilterId)?.shortName?.trim() ||
                          manufacturers.find((x) => x.id === manufacturerFilterId)?.legalName) ??
                          "this manufacturer"}
                      </span>
                      &apos;s catalog batch for traceability.
                    </p>
                  ) : (
                    <p className="mt-1">
                      No active wholesale listing for this medicine under that manufacturer—your store listing will be
                      created without a batch link.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ms-price">Retail price</Label>
                <Input
                  id="ms-price"
                  inputMode="decimal"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value)}
                  placeholder="e.g. 150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ms-qty">Listed quantity</Label>
                <Input
                  id="ms-qty"
                  inputMode="numeric"
                  value={listedQty}
                  onChange={(e) => setListedQty(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="ms-sort">Sort order</Label>
              <Input
                id="ms-sort"
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
            <PackImagesField
              idPrefix="ms"
              items={packImagesAdd}
              disabled={submitting}
              onAddFiles={(files) => addPackFiles(setPackImagesAdd, files)}
              onRemove={(i) => removePackAt(i, setPackImagesAdd)}
            />
            <div className="flex items-center gap-2">
              <Checkbox id="ms-active" checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
              <Label htmlFor="ms-active" className="text-sm font-normal cursor-pointer">
                Visible on storefront
              </Label>
            </div>
            {storeCategories.length > 0 ? (
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-border/60 p-2">
                  {storeCategories.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`ms-cat-${c.id}`}
                        checked={selectedCategoryIdsAdd.includes(c.id)}
                        onCheckedChange={(v) => {
                          setSelectedCategoryIdsAdd((prev) =>
                            v === true ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id),
                          );
                        }}
                      />
                      <Label htmlFor={`ms-cat-${c.id}`} className="text-sm font-normal cursor-pointer">
                        {c.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="space-y-2 rounded-xl border border-border/80 bg-muted/15 p-4">
              <Label htmlFor="ms-desc" className="text-base font-semibold">
                Storefront description
              </Label>
              <p className="text-xs text-muted-foreground">
                Long-form product copy for this listing only. Customers see it on your public product page.
              </p>
              <Textarea
                id="ms-desc"
                value={drugDescriptionAdd}
                onChange={(e) => setDrugDescriptionAdd(e.target.value)}
                placeholder="Ingredients, usage, warnings, or other details you want to highlight…"
                rows={5}
                className="resize-y min-h-[100px]"
              />
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
              <ListingFaqEditor idPrefix="ms" items={faqsAdd} onChange={setFaqsAdd} disabled={submitting} />
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={submitting || (!!manufacturerFilterId.trim() && batchLinkLoading)}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-h-[min(90vh,780px)] overflow-y-auto sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit listing</DialogTitle>
            <DialogDescription>
              Update pricing, stock, photos, description, and FAQs for this listing. The catalog medicine cannot be
              changed.
            </DialogDescription>
          </DialogHeader>
          {editRow ? (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <p className="font-medium">{editRow.medicineName}</p>
                {editRow.categories?.length ? (
                  <p className="text-xs text-muted-foreground">
                    {editRow.categories.map((c) => c.name).join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Manufacturer / wholesale batch</p>
                <p className="font-medium text-foreground">{editRow.manufacturerName ?? "—"}</p>
                {editRow.manufacturerMedicineId ? (
                  <p className="text-xs text-muted-foreground">Linked to manufacturer wholesale catalog (batch).</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not linked to a manufacturer batch.</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ed-price">Retail price</Label>
                  <Input
                    id="ed-price"
                    inputMode="decimal"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ed-qty">Listed quantity</Label>
                  <Input id="ed-qty" inputMode="numeric" value={listedQty} onChange={(e) => setListedQty(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="ed-sort">Sort order</Label>
                <Input id="ed-sort" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
              <PackImagesField
                idPrefix="ed"
                items={editPackImages}
                disabled={submitting}
                onAddFiles={(files) => addPackFiles(setEditPackImages, files)}
                onRemove={(i) => removePackAt(i, setEditPackImages)}
              />
              <div className="flex items-center gap-2">
                <Checkbox id="ed-active" checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
                <Label htmlFor="ed-active" className="text-sm font-normal cursor-pointer">
                  Visible on storefront
                </Label>
              </div>
              {storeCategories.length > 0 ? (
                <div className="space-y-2">
                  <Label>Categories</Label>
                  <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-border/60 p-2">
                    {storeCategories.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`ed-cat-${c.id}`}
                          checked={selectedCategoryIdsEdit.includes(c.id)}
                          onCheckedChange={(v) => {
                            setSelectedCategoryIdsEdit((prev) =>
                              v === true ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id),
                            );
                          }}
                        />
                        <Label htmlFor={`ed-cat-${c.id}`} className="text-sm font-normal cursor-pointer">
                          {c.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="space-y-2 rounded-xl border border-border/80 bg-muted/15 p-4">
                <Label htmlFor="ed-desc" className="text-base font-semibold">
                  Storefront description
                </Label>
                <p className="text-xs text-muted-foreground">
                  Long-form product copy for this listing only. Customers see it on your public product page.
                </p>
                <Textarea
                  id="ed-desc"
                  value={drugDescriptionEdit}
                  onChange={(e) => setDrugDescriptionEdit(e.target.value)}
                  placeholder="Ingredients, usage, warnings, or other details you want to highlight…"
                  rows={5}
                  className="resize-y min-h-[100px]"
                />
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
                <ListingFaqEditor idPrefix="ed" items={faqsEdit} onChange={setFaqsEdit} disabled={submitting} />
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove listing?</DialogTitle>
            <DialogDescription>
              This removes <strong className="text-foreground">{deleteRow?.medicineName}</strong> from your store catalog.
              You can add it again later.
            </DialogDescription>
          </DialogHeader>
          {formError && deleteRow ? <p className="text-sm text-destructive">{formError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteRow(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
