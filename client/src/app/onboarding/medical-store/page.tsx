"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MedicalStoreMapPicker } from "@/components/medical-store/medical-store-map";
import { useMedicalStoreOnboarding, useGetMedicalStoreOnboarding } from "../hooks/use-onboarding";
import {
  MedicalStoreOnboardingRequest,
  MedicalStoreFormValues,
} from "../_components/_types";
import OnboardingPage from "../_components/OnboardingPage";
import { Building2, MapPin, Phone, Mail, Globe, FileText, Clock3, MapPinned, LocateFixed } from "lucide-react";
import { useCustomToast } from "@/hooks/use-custom-toast";

function parseRequiredCoord(value: string, label: string): number {
  const n = parseFloat(String(value).trim());
  if (!Number.isFinite(n)) {
    throw new Error(`${label} must be a valid number`);
  }
  return n;
}

export default function MedicalStoreOnboardingPage() {
  const medicalStoreOnboardingMutation = useMedicalStoreOnboarding();
  const { data: savedData, isLoading: loadingSavedData } = useGetMedicalStoreOnboarding();
  const { showError } = useCustomToast();

  const form = useForm<MedicalStoreFormValues>({
    defaultValues: {
      storeName: "",
      addressLine: "",
      city: "",
      province: "",
      postalCode: "",
      phone: "",
      licenseNumber: "",
      website: "",
      email: "",
      openingTime: "",
      closingTime: "",
      latitude: "",
      longitude: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (savedData && !loadingSavedData && savedData !== null) {
      const data: Record<string, unknown> = savedData;
      form.reset({
        storeName: String(data.storeName ?? ""),
        addressLine: String(data.addressLine ?? ""),
        city: String(data.city ?? ""),
        province: String(data.province ?? ""),
        postalCode: String(data.postalCode ?? ""),
        phone: String(data.phone ?? ""),
        licenseNumber: String(data.licenseNumber ?? ""),
        website: String(data.website ?? ""),
        email: String(data.email ?? ""),
        openingTime: String(data.openingTime ?? ""),
        closingTime: String(data.closingTime ?? ""),
        latitude:
          data.latitude != null && data.latitude !== ""
            ? String(data.latitude)
            : "",
        longitude:
          data.longitude != null && data.longitude !== ""
            ? String(data.longitude)
            : "",
      });
    }
  }, [savedData, loadingSavedData, form]);

  const { handleSubmit, control, setValue, watch } = form;

  const handleMapPosition = (lat: number, lng: number) => {
    setValue("latitude", lat.toFixed(6), { shouldValidate: true, shouldDirty: true });
    setValue("longitude", lng.toFixed(6), { shouldValidate: true, shouldDirty: true });
  };

  const handleLocateMe = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      showError("Location unavailable", "Your browser does not support geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleMapPosition(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        showError(
          "Could not get your location",
          err.message || "Permission denied, unavailable, or timed out. You can drag the pin instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const latWatch = watch("latitude");
  const lngWatch = watch("longitude");

  const onSubmit = (data: MedicalStoreFormValues) => {
    let lat: number;
    let lng: number;
    try {
      lat = parseRequiredCoord(data.latitude, "Latitude");
      lng = parseRequiredCoord(data.longitude, "Longitude");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid coordinates";
      form.setError("latitude", { message: msg });
      return;
    }
    if (lat < -90 || lat > 90) {
      form.setError("latitude", { message: "Latitude must be between -90 and 90" });
      return;
    }
    if (lng < -180 || lng > 180) {
      form.setError("longitude", { message: "Longitude must be between -180 and 180" });
      return;
    }

    const payload: MedicalStoreOnboardingRequest = {
      storeName: data.storeName,
      addressLine: data.addressLine,
      city: data.city,
      province: data.province || undefined,
      postalCode: data.postalCode || undefined,
      phone: data.phone,
      licenseNumber: data.licenseNumber || undefined,
      website: data.website || undefined,
      email: data.email || undefined,
      openingTime: data.openingTime || undefined,
      closingTime: data.closingTime || undefined,
      latitude: lat,
      longitude: lng,
    };
    medicalStoreOnboardingMutation.mutate(payload);
  };

  return (
    <OnboardingPage
      step={1}
      maxSteps={1}
      title="Medical store profile"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={medicalStoreOnboardingMutation.isLoading}
    >
      <Form {...form}>
        <div className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="mb-1 flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Store details</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Your registered pharmacy or medical store. Coordinates enable nearest-store search on PillSure.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={control}
                  name="storeName"
                  rules={{ required: "Store name is required" }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        Store name <span className="text-destructive">*</span>
                      </Label>
                      <FormControl>
                        <Input placeholder="Registered business name" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="addressLine"
                  rules={{ required: "Address is required" }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        Address <span className="text-destructive">*</span>
                      </Label>
                      <FormControl>
                        <Input placeholder="Street, building" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="city"
                  rules={{ required: "City is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-sm font-medium">
                        City <span className="text-destructive">*</span>
                      </Label>
                      <FormControl>
                        <Input placeholder="City" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-sm font-medium">Province / region</Label>
                      <FormControl>
                        <Input placeholder="Province" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-sm font-medium">Postal code</Label>
                      <FormControl>
                        <Input placeholder="Postal code" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="phone"
                  rules={{ required: "Phone is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        Phone <span className="text-destructive">*</span>
                      </Label>
                      <FormControl>
                        <Input placeholder="Contact number" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        Store email
                      </Label>
                      <FormControl>
                        <Input type="email" placeholder="email@store.com" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        License number
                      </Label>
                      <FormControl>
                        <Input placeholder="Optional retail / pharmacy license" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        Website
                      </Label>
                      <FormControl>
                        <Input placeholder="https://..." {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="openingTime"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Clock3 className="h-3.5 w-3.5 text-primary" />
                        Opening time
                      </Label>
                      <FormControl>
                        <Input type="time" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="closingTime"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Clock3 className="h-3.5 w-3.5 text-primary" />
                        Closing time
                      </Label>
                      <FormControl>
                        <Input type="time" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="mb-1 flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <MapPinned className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Store location on map</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Use your device location or tap the map / drag the pin. Your position is saved for nearest-store
                    search.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleLocateMe}>
                  <LocateFixed className="h-4 w-4" />
                  Use my location
                </Button>
                <p className="text-xs text-muted-foreground">
                  {latWatch && lngWatch ? (
                    <span className="font-mono">
                      {Number(latWatch).toFixed(6)}, {Number(lngWatch).toFixed(6)}
                    </span>
                  ) : (
                    "Tap the map or use your location to place your store pin."
                  )}
                </p>
              </div>

              <MedicalStoreMapPicker
                latitude={typeof latWatch === "string" ? latWatch : ""}
                longitude={typeof lngWatch === "string" ? lngWatch : ""}
                onPositionChange={handleMapPosition}
              />

              <FormField
                control={control}
                name="latitude"
                rules={{ required: "Set your store location on the map" }}
                render={({ field }) => <input type="hidden" {...field} />}
              />
              <FormField
                control={control}
                name="longitude"
                rules={{ required: "Set your store location on the map" }}
                render={({ field }) => <input type="hidden" {...field} />}
              />
              {(form.formState.errors.latitude || form.formState.errors.longitude) && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.latitude?.message || form.formState.errors.longitude?.message}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </Form>
    </OnboardingPage>
  );
}
