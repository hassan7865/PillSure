"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Medicine, UpdateMedicineRequest } from "./_types";
import { adminApi } from "./_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Camera, X } from "lucide-react";
import Image from "next/image";

interface EditMedicineDialogProps {
  open: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  onUpdate: () => void;
}

interface ImageItem {
  url: string;
  file?: File;
  isNew?: boolean;
}

interface MedicineFormValues {
  medicineName: string;
  medicineUrl: string | null;
  price: string | null;
  discount: string | null;
  stock: number | null;
  images: ImageItem[];
  prescriptionRequired: boolean;
  drugDescription: string | null;
  drugCategory: string | null;
  drugVarient: string | null;
}

export default function EditMedicineDialog({
  open,
  onClose,
  medicine,
  onUpdate,
}: EditMedicineDialogProps) {
  const { showSuccess, showError } = useCustomToast();

  const form = useForm<MedicineFormValues>({
    defaultValues: {
      medicineName: "",
      medicineUrl: null,
      price: null,
      discount: null,
      stock: null,
      images: [],
      prescriptionRequired: false,
      drugDescription: null,
      drugCategory: null,
      drugVarient: null,
    },
    mode: "onChange",
  });

  // Populate form when medicine changes
  useEffect(() => {
    if (medicine && open) {
      // Parse images array from medicine
      let imagesArray: ImageItem[] = [];
      if (medicine.images) {
        if (Array.isArray(medicine.images)) {
          imagesArray = medicine.images.map((img: any) => ({
            url: typeof img === 'string' ? img : (img?.url || img),
            isNew: false,
          }));
        }
      }

      form.reset({
        medicineName: medicine.medicineName || "",
        medicineUrl: medicine.medicineUrl || null,
        price: medicine.price || null,
        discount: medicine.discount || null,
        stock: medicine.stock || null,
        images: imagesArray,
        prescriptionRequired: medicine.prescriptionRequired || false,
        drugDescription: medicine.drugDescription || null,
        drugCategory: medicine.drugCategory || null,
        drugVarient: medicine.drugVarient || null,
      });
    }
  }, [medicine, open, form]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const currentImages = form.getValues("images") || [];
    
    // Validate: maximum 4 images allowed
    const totalImages = currentImages.length + files.length;
    if (totalImages > 4) {
      showError(
        "Too many images",
        `Maximum 4 images allowed. You have ${currentImages.length} existing images and are trying to add ${files.length} more.`
      );
      event.target.value = '';
      return;
    }

    const newImages: ImageItem[] = [];

    // Validate and process each selected file
    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError("Invalid file type", `${file.name} is not an image file`);
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        showError("File too large", `${file.name} exceeds 5MB limit`);
        return;
      }

      const url = URL.createObjectURL(file);
      newImages.push({
        url,
        file,
        isNew: true,
      });
    });

    // Combine existing and new images
    if (newImages.length > 0) {
      form.setValue("images", [...currentImages, ...newImages]);
    }
    
    // Reset input
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    const currentImages = form.getValues("images") || [];
    const imageToRemove = currentImages[index];
    
    // Cleanup blob URL if it's a new file
    if (imageToRemove?.isNew && imageToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }
    
    const updatedImages = currentImages.filter((_, i) => i !== index);
    form.setValue("images", updatedImages);
  };

  const handleClose = () => {
    // Cleanup all blob URLs
    const images = form.getValues("images") || [];
    images.forEach((img) => {
      if (img.isNew && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });
    
    form.reset();
    onClose();
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      const images = form.getValues("images") || [];
      images.forEach((img) => {
        if (img.isNew && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
    };
  }, [form]);

  const onSubmit = async (data: MedicineFormValues) => {
    if (!medicine) return;

    try {
      // Validate: at least 1 image, max 4 images
      const images = data.images || [];
      if (images.length === 0) {
        showError("No images", "At least one image is required");
        return;
      }

      if (images.length > 4) {
        showError("Too many images", "Maximum 4 images allowed");
        return;
      }

      // Separate new files and existing URLs
      const newFiles: File[] = [];
      const existingUrls: string[] = [];

      images.forEach((img) => {
        if (img.file && img.isNew) {
          newFiles.push(img.file);
        } else if (img.url && !img.url.startsWith('blob:')) {
          existingUrls.push(img.url);
        }
      });

      // Upload images to S3 and update medicine
      let updatedMedicine: Medicine;
      if (newFiles.length > 0 || existingUrls.length !== (medicine.images as any[])?.length) {
        // Images changed - use S3 upload endpoint
        updatedMedicine = await adminApi.updateMedicineImages(
          medicine.id,
          newFiles,
          existingUrls
        );
      } else {
        // No image changes - use regular update endpoint
        const updateData: UpdateMedicineRequest = {
          medicineName: data.medicineName || undefined,
          medicineUrl: data.medicineUrl || null,
          price: data.price || null,
          discount: data.discount || null,
          stock: data.stock || null,
          prescriptionRequired: data.prescriptionRequired,
          drugDescription: data.drugDescription || null,
          drugCategory: data.drugCategory || null,
          drugVarient: data.drugVarient || null,
        };

        updatedMedicine = await adminApi.updateMedicine(medicine.id, updateData);
      }

      // If images were uploaded, update other fields separately if needed
      if (newFiles.length > 0 && (
        data.medicineName !== medicine.medicineName ||
        data.price !== medicine.price ||
        data.stock !== medicine.stock ||
        data.discount !== medicine.discount ||
        data.drugCategory !== medicine.drugCategory ||
        data.drugVarient !== medicine.drugVarient ||
        data.drugDescription !== medicine.drugDescription ||
        data.prescriptionRequired !== medicine.prescriptionRequired
      )) {
        // Update other fields after image upload
        const updateData: UpdateMedicineRequest = {
          medicineName: data.medicineName || undefined,
          medicineUrl: data.medicineUrl || null,
          price: data.price || null,
          discount: data.discount || null,
          stock: data.stock || null,
          prescriptionRequired: data.prescriptionRequired,
          drugDescription: data.drugDescription || null,
          drugCategory: data.drugCategory || null,
          drugVarient: data.drugVarient || null,
        };

        await adminApi.updateMedicine(medicine.id, updateData);
      }

      showSuccess("Medicine updated successfully", "The medicine has been updated.");
      handleClose();
      onUpdate(); // Refresh the medicines list
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      showError("Failed to update medicine", errorMsg);
    }
  };

  if (!medicine) return null;

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[95vh] sm:max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex-shrink-0 border-b">
          <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold">Edit Medicine</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Update the medicine information below
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="space-y-4 sm:space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="medicineName"
                  rules={{ required: "Medicine name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="medicineName" className="text-sm font-medium">Medicine Name *</Label>
                      <FormControl>
                        <Input
                          id="medicineName"
                          {...field}
                          placeholder="Enter medicine name"
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="price" className="text-sm font-medium">Price (PKR)</Label>
                        <FormControl>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            placeholder="Enter price"
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="discount" className="text-sm font-medium">Discount (%)</Label>
                        <FormControl>
                          <Input
                            id="discount"
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            placeholder="Enter discount percentage"
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="stock" className="text-sm font-medium">Stock</Label>
                        <FormControl>
                          <Input
                            id="stock"
                            type="number"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Enter stock quantity"
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="drugCategory"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="drugCategory" className="text-sm font-medium">Category</Label>
                        <FormControl>
                          <Input
                            id="drugCategory"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            placeholder="Enter category"
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="drugVarient"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="drugVarient" className="text-sm font-medium">Variant</Label>
                      <FormControl>
                        <Input
                          id="drugVarient"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          placeholder="Enter variant"
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="images"
                  render={() => {
                    const images = form.watch("images") || [];
                    const remainingSlots = 4 - images.length;
                    return (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="medicineImages" className="text-sm font-medium">Medicine Images</Label>
                          <span className="text-xs text-muted-foreground">
                            {images.length} / 4 images
                          </span>
                        </div>
                        <FormControl>
                          <div className="space-y-3">
                            {remainingSlots > 0 && (
                              <div>
                                <Input
                                  id="medicineImages"
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleImageChange}
                                  className="w-full cursor-pointer"
                                  disabled={images.length >= 4}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  You can add {remainingSlots} more image{remainingSlots !== 1 ? 's' : ''} (Max 5MB each)
                                </p>
                              </div>
                            )}
                            {images.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {images.map((img, index) => (
                                  <div
                                    key={index}
                                    className="relative group aspect-square rounded-lg border-2 border-border bg-muted/50 overflow-hidden"
                                  >
                                    <Image
                                      src={img.url}
                                      alt={`Medicine image ${index + 1}`}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeImage(index)}
                                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-full h-32 sm:h-40 rounded-lg border-2 border-dashed border-border bg-muted/50">
                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                  <Camera className="h-8 w-8 sm:h-10 sm:w-10" />
                                  <p className="text-xs sm:text-sm text-center px-4">No images selected</p>
                                  <p className="text-xs text-muted-foreground/70">Add up to 4 images (Max 5MB each)</p>
                                </div>
                              </div>
                            )}
                            {images.length >= 4 && (
                              <p className="text-xs text-amber-600 dark:text-amber-500">
                                Maximum limit reached. Remove an image to add a new one.
                              </p>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="drugDescription"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="drugDescription" className="text-sm font-medium">Description</Label>
                      <FormControl>
                        <Textarea
                          id="drugDescription"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          placeholder="Enter medicine description"
                          rows={4}
                          className="w-full resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prescriptionRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="prescriptionRequired" className="text-sm font-normal cursor-pointer">
                          Prescription Required
                        </Label>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-6 pt-4 border-t flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Updating..." : "Update Medicine"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

