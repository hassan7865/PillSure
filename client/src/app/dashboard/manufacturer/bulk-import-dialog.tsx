"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { manufacturerApi, type ManufacturerImportSummary } from "./_api";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful API response so the parent can refresh listings */
  onImportComplete?: () => void;
};

export function ManufacturerBulkImportDialog({ open, onOpenChange, onImportComplete }: Props) {
  const { showSuccess, showError } = useCustomToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ManufacturerImportSummary | null>(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const blob = await manufacturerApi.downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "manufacturer-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      showSuccess("Template downloaded", "Fill the sheet and upload it below.");
    } catch (e: unknown) {
      showError("Download failed", getErrorMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      showError("Invalid file", "Please choose an Excel file (.xlsx or .xls).");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const summary = await manufacturerApi.importMedicinesExcel(file);
      setResult(summary);
      const hasErr = summary.errors.length > 0;
      showSuccess(
        hasErr ? "Import finished with row errors" : "Import completed",
        hasErr ? "Review details below." : "Your listings were updated."
      );
      onImportComplete?.();
    } catch (e: unknown) {
      showError("Import failed", getErrorMessage(e));
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <DialogTitle>Bulk import (Excel)</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet with generic columns. If a row&apos;s medicine name matches a product already on your
            manufacturer list (same normalized name), that listing is updated. Otherwise we match the global catalog or
            create a new medicine, then add or update your wholesale row.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">Columns (flexible names)</p>
              <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-xs">
                <li>
                  <strong>Medicine Name</strong> — required.
                </li>
                <li>
                  Matching uses a normalized key: lowercase, then letters and digits only (a–z, 0–9).
                </li>
                <li>
                  <strong>Wholesale Price</strong> (or Price) — <span className="text-destructive">required</span>.
                </li>
                <li>
                  <strong>MOQ</strong>, <strong>Listed Quantity</strong>, <strong>Prescription Required</strong> —
                  optional.
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">1. Template</p>
                <p className="text-muted-foreground text-xs">Download a starter file with recommended headers.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={handleDownloadTemplate}
                disabled={downloading}
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download .xlsx
              </Button>
            </div>

            <div>
              <p className="text-sm font-medium">2. Upload</p>
              <p className="text-muted-foreground text-xs">First sheet only. Max 10 MB.</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                className="mt-2 gap-2"
                disabled={loading}
                onClick={() => inputRef.current?.click()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Choose Excel file
              </Button>
              <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                Multipart field: <code className="bg-muted rounded px-1 py-0.5">file</code>
              </div>
            </div>

            {result ? (
              <div className="space-y-3 rounded-md border p-3 text-sm">
                <p className="font-medium">Result</p>
                <p>
                  <span className="text-muted-foreground">New medicines:</span> {result.createdMedicines}
                </p>
                <p>
                  <span className="text-muted-foreground">Listings updated:</span> {result.updatedListings}
                </p>
                <p>
                  <span className="text-muted-foreground">New listings:</span> {result.createdListings}
                </p>
                {result.warnings && result.warnings.length > 0 ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                    <p className="font-medium text-amber-900 dark:text-amber-100">Warnings ({result.warnings.length})</p>
                    <ul className="mt-1 max-h-32 list-inside list-disc space-y-0.5 overflow-y-auto text-xs">
                      {result.warnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {result.errors.length > 0 ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                    <p className="font-medium text-destructive">Errors ({result.errors.length})</p>
                    <ul className="mt-1 max-h-40 list-inside list-disc space-y-0.5 overflow-y-auto text-xs">
                      {result.errors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
