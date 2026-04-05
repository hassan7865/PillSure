"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useManufacturerOnboarding, useGetManufacturerOnboarding } from "../hooks/use-onboarding";
import {
  ManufacturerOnboardingRequest,
  ManufacturerFormValues,
} from "../_components/_types";
import OnboardingPage from "../_components/OnboardingPage";
import { Building2, MapPin, Phone, Mail, Globe, FileText } from "lucide-react";

export default function ManufacturerOnboardingPage() {
  const manufacturerOnboardingMutation = useManufacturerOnboarding();
  const { data: savedData, isLoading: loadingSavedData } = useGetManufacturerOnboarding();

  const form = useForm<ManufacturerFormValues>({
    defaultValues: {
      legalName: "",
      shortName: "",
      addressLine: "",
      city: "",
      province: "",
      postalCode: "",
      phone: "",
      licenseNumber: "",
      website: "",
      email: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (savedData && !loadingSavedData && savedData !== null) {
      const data: Record<string, unknown> = savedData;
      form.reset({
        legalName: String(data.legalName ?? ""),
        shortName: String(data.shortName ?? ""),
        addressLine: String(data.addressLine ?? ""),
        city: String(data.city ?? ""),
        province: String(data.province ?? ""),
        postalCode: String(data.postalCode ?? ""),
        phone: String(data.phone ?? ""),
        licenseNumber: String(data.licenseNumber ?? ""),
        website: String(data.website ?? ""),
        email: String(data.email ?? ""),
      });
    }
  }, [savedData, loadingSavedData, form]);

  const { handleSubmit, control } = form;

  const onSubmit = (data: ManufacturerFormValues) => {
    const payload: ManufacturerOnboardingRequest = {
      legalName: data.legalName,
      shortName: data.shortName || undefined,
      addressLine: data.addressLine,
      city: data.city,
      province: data.province || undefined,
      postalCode: data.postalCode || undefined,
      phone: data.phone,
      licenseNumber: data.licenseNumber,
      website: data.website || undefined,
      email: data.email || undefined,
    };
    manufacturerOnboardingMutation.mutate(payload);
  };

  return (
    <OnboardingPage
      step={1}
      maxSteps={1}
      title="Manufacturer profile"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={manufacturerOnboardingMutation.isLoading}
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
                  <CardTitle className="text-lg text-foreground">Company details</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Complete your legal and contact information to list medicines on PillSure.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={control}
                  name="legalName"
                  rules={{ required: "Legal name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        Legal name <span className="text-destructive">*</span>
                      </Label>
                      <FormControl>
                        <Input placeholder="Registered company name" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="shortName"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-sm font-medium">Short name</Label>
                      <FormControl>
                        <Input placeholder="Optional display name" {...field} className="h-9" />
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
                        Company email
                      </Label>
                      <FormControl>
                        <Input type="email" placeholder="email@company.com" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="licenseNumber"
                  rules={{ required: "License number is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        License number <span className="text-destructive">*</span>
                      </Label>
                      <FormControl>
                        <Input placeholder="Manufacturing / distribution license" {...field} className="h-9" />
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
              </div>
            </CardContent>
          </Card>
        </div>
      </Form>
    </OnboardingPage>
  );
}
