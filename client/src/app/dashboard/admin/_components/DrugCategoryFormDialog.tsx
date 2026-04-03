"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { DrugCategory } from "./_types";
import { adminApi } from "./_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";

interface DrugCategoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  category: DrugCategory | null;
  onSaved: () => void;
}

type FormValues = {
  name: string;
};

export default function DrugCategoryFormDialog({
  open,
  onClose,
  category,
  onSaved,
}: DrugCategoryFormDialogProps) {
  const { showSuccess, showError } = useCustomToast();
  const isEdit = category != null;

  const form = useForm<FormValues>({
    defaultValues: { name: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: category?.name ?? "" });
    }
  }, [open, category, form]);

  const handleClose = () => {
    form.reset({ name: "" });
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    const trimmed = data.name.trim();
    if (!trimmed) {
      showError("Validation", "Name is required");
      return;
    }
    try {
      if (isEdit && category) {
        await adminApi.updateDrugCategory(category.id, trimmed);
        showSuccess("Category updated", "The medicine category was saved.");
      } else {
        await adminApi.createDrugCategory(trimmed);
        showSuccess("Category created", "The medicine category was added.");
      }
      handleClose();
      onSaved();
    } catch (err) {
      showError("Could not save category", getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold sm:text-xl md:text-2xl">
            {isEdit ? "Edit Category" : "New Category"}
          </DialogTitle>
          <DialogDescription>
            Used to classify medicines and to match doctor specializations (see Mapping on the list).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="category-name">Name</Label>
                  <FormControl>
                    <Input
                      id="category-name"
                      placeholder="e.g. Antibiotics"
                      autoComplete="off"
                      maxLength={200}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
