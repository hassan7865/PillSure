"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHospitalOnboarding, useGetHospitalOnboarding } from "../hooks/use-onboarding";
import { HospitalOnboardingRequest, HospitalFormValues } from "../_components/_types";
import OnboardingPage from "../_components/OnboardingPage";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  FileText, 
  User
} from "lucide-react";

export default function HospitalOnboarding() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [step, setStep] = useState(1);
  const hospitalOnboardingMutation = useHospitalOnboarding();

  // Fetch saved onboarding data
  const { data: savedData, isLoading: loadingSavedData } = useGetHospitalOnboarding();

  // Sync step with URL
  useEffect(() => {
    const urlStep = parseInt(searchParams.get('step') || '1');
    if (urlStep !== step) {
      setStep(urlStep);
    }
  }, [searchParams]);
  
  const form = useForm<HospitalFormValues>({
    defaultValues: {
      hospitalName: "",
      hospitalAddress: "",
      hospitalContactNo: "",
      hospitalEmail: "",
      websiteHospital: "",
      licenseNo: "",
      adminName: "",
    },
    mode: "onChange",
  });

  // Prepopulate form with saved data
  useEffect(() => {
    if (savedData && !loadingSavedData && savedData !== null) {
      const data: any = savedData;
      const formData: any = {
        hospitalName: data.hospitalName || "",
        hospitalAddress: data.hospitalAddress || "",
        hospitalContactNo: data.hospitalContactNo || "",
        hospitalEmail: data.hospitalEmail || "",
        websiteHospital: data.websiteHospital || "",
        licenseNo: data.licenseNo || "",
        adminName: data.adminName || "",
      };

      form.reset(formData);
    }
  }, [savedData, loadingSavedData, form]);

  const {
    handleSubmit,
    trigger,
    control,
    formState: { errors },
    setError,
  } = form;

  const onSubmit = (data: HospitalFormValues) => {
    // Step 2 validation
    let valid = true;
    if (!data.licenseNo) {
      setError("licenseNo", { type: "manual", message: "License number is required" });
      valid = false;
    }
    if (!data.adminName) {
      setError("adminName", { type: "manual", message: "Admin/Owner name is required" });
      valid = false;
    }
    if (!valid) return;

    const onboardingData: HospitalOnboardingRequest = {
      hospitalName: data.hospitalName,
      hospitalAddress: data.hospitalAddress,
      hospitalContactNo: data.hospitalContactNo,
      hospitalEmail: data.hospitalEmail,
      websiteHospital: data.websiteHospital,
      licenseNo: data.licenseNo,
      adminName: data.adminName,
    };
    
    hospitalOnboardingMutation.mutate(onboardingData);
  };

  // Update URL with current step
  const updateStepInURL = (newStep: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', newStep.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const nextStep = async () => {
    const fieldsToValidate = ['hospitalName', 'hospitalAddress', 'hospitalContactNo', 'hospitalEmail'];
    const isValid = await trigger(fieldsToValidate as any);
    if (!isValid) {
      return; // Stop if validation fails
    }
    
    // Auto-save all current data (including step 2 if exists)
    const currentData = form.getValues();
    await hospitalOnboardingMutation.mutateAsync(currentData);
    
    setStep(2);
    updateStepInURL(2);
  };

  const prevStep = () => {
    if (step > 1) {
      const newStep = step - 1;
      setStep(newStep);
      updateStepInURL(newStep);
    }
  };

  const getStepFields = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Hospital Information</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Provide your hospital's details to get started
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="hospitalName"
                  rules={{
                    required: "Hospital name is required"
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        Hospital Name
                      </Label>
                      <FormControl>
                        <Input placeholder="Enter hospital name" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="hospitalAddress"
                  rules={{
                    required: "Hospital address is required"
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        Hospital Address
                      </Label>
                      <FormControl>
                        <Input placeholder="Enter hospital address" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="hospitalContactNo"
                  rules={{
                    required: "Contact number is required",
                    pattern: {
                      value: /^[0-9]{10,15}$/,
                      message: "Enter a valid contact number (10-15 digits)"
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        Hospital Contact No.
                      </Label>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="Enter contact number"
                          {...field}
                          onChange={e => {
                            const value = e.target.value.replace(/[^0-9]/g, "");
                            field.onChange(value);
                          }}
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="hospitalEmail"
                  rules={{
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address"
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        Hospital Email
                      </Label>
                      <FormControl>
                        <Input type="email" placeholder="Enter hospital email" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Admin & Licensing Details</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Please provide licensing information for verification
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={control}
                name="websiteHospital"
                render={({ field }) => (
                  <FormItem>
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                      Hospital Website
                    </Label>
                    <FormControl>
                      <Input placeholder="Website (Optional)" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="licenseNo"
                rules={{
                  required: "License number is required"
                }}
                render={({ field }) => (
                  <FormItem>
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      License No
                    </Label>
                    <FormControl>
                      <Input placeholder="Enter license number" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="adminName"
                rules={{
                  required: "Admin/Owner name is required"
                }}
                render={({ field }) => (
                  <FormItem>
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Admin & Owner Name
                    </Label>
                    <FormControl>
                      <Input placeholder="Enter admin/owner name" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <OnboardingPage
          step={step}
          maxSteps={2}
          title="Hospital Onboarding"
          onBack={step > 1 ? prevStep : undefined}
          onNext={step < 2 ? nextStep : undefined}
          onSubmit={step === 2 ? handleSubmit(onSubmit) : undefined}
          isSubmitting={hospitalOnboardingMutation.isPending}
        >
          {getStepFields(step)}
        </OnboardingPage>
      </form>
    </Form>
  );
}
