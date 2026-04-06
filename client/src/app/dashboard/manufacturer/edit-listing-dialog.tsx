"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/shell/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { manufacturerApi, type ManufacturerListingRow } from "./_api";
import { getErrorMessage } from "@/lib/error-utils";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ManufacturerListingRow | null;
  onSaved: () => void;
};

export function ManufacturerEditListingDialog({ open, onOpenChange, row, onSaved }: Props) {
  const { showSuccess, showError } = useCustomToast();
  const [saving, setSaving] = useState(false);
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [moq, setMoq] = useState("1");
  const [listedQuantity, setListedQuantity] = useState("0");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && row) {
      setWholesalePrice(row.wholesalePrice);
      setMoq(String(row.moq));
      setListedQuantity(String(row.listedQuantity));
      setIsActive(row.isActive);
    }
  }, [open, row]);

  const handleSave = async () => {
    if (!row) return;
    setSaving(true);
    try {
      await manufacturerApi.updateManufacturerListing(row.listingId, {
        wholesalePrice,
        moq: Math.max(1, parseInt(moq, 10) || 1),
        listedQuantity: Math.max(0, parseInt(listedQuantity, 10) || 0),
        isActive,
      });
      showSuccess("Saved", "Listing updated.");
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      showError("Could not save", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="sm" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit listing</DialogTitle>
          <DialogDescription>
            Update wholesale price, MOQ, and listed quantity for this medicine. Changes apply to your manufacturer
            catalog only.
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <div className="space-y-3 py-1">
            <p className="text-sm font-medium leading-snug text-foreground">{row.medicineName}</p>
            <p className="text-muted-foreground text-xs">Currency: {row.currency}</p>
            <div className="space-y-2">
              <Label htmlFor="mfr-wholesale">Wholesale price</Label>
              <Input
                id="mfr-wholesale"
                inputMode="decimal"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="mfr-moq">MOQ</Label>
                <Input
                  id="mfr-moq"
                  type="number"
                  min={1}
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfr-qty">Listed quantity</Label>
                <Input
                  id="mfr-qty"
                  type="number"
                  min={0}
                  value={listedQuantity}
                  onChange={(e) => setListedQuantity(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
              <Checkbox
                id="mfr-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label htmlFor="mfr-active" className="text-sm font-medium leading-none">
                  Active listing
                </Label>
                <p className="text-muted-foreground text-xs">Inactive rows are hidden from medical stores.</p>
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !row}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </AppDialogContent>
    </Dialog>
  );
}
