"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useDoctorOnboarding, useGetDoctorOnboarding } from "../hooks/use-onboarding";
import { DoctorFormValues, DoctorOnboardingRequest } from "../_components/_types";
import { useSpecializations } from "@/hooks/use-doctor";
import ReactSelect from "react-select";
import OnboardingPage from "../_components/OnboardingPage";
import {
  User,
  Phone,
  MapPin,
  Stethoscope,
  GraduationCap,
  Clock,
  Camera,
  Plus,
  X,
  Pill,
  CheckCircle
} from "lucide-react";
import { Specialization } from "@/lib/types";

export default function DoctorOnboarding() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [step, setStep] = useState(1);
  const [qualificationInput, setQualificationInput] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const doctorOnboardingMutation = useDoctorOnboarding();

  // Fetch saved onboarding data
  const { data: savedData, isLoading: loadingSavedData } = useGetDoctorOnboarding();

  // Sync step with URL
  useEffect(() => {
    const urlStep = parseInt(searchParams.get('step') || '1');
    if (urlStep !== step) {
      setStep(urlStep);
    }
  }, [searchParams]);

  // Fetch specializations from API
  const { data: specializationsData, isLoading: specializationsLoading } = useSpecializations();
  const availableSpecializations = specializationsData || [];

  const form = useForm<DoctorFormValues>({
    defaultValues: {
      gender: "male",
      mobile: "",
      specializationIds: [] as number[],
      qualifications: [],
      experienceYears: 0,
      address: "",
      feePkr: undefined,
      consultationModes: [],
      openingTime: undefined,
      closingTime: undefined,
      availableDays: [],
    },
    mode: "onChange",
  });

  // Prepopulate form with saved data
  useEffect(() => {
    if (savedData && !loadingSavedData && savedData !== null) {
      const data: any = savedData;
      
      const formData: DoctorFormValues = {
        gender: data.gender || "male",
        mobile: data.mobile || "",
        address: data.address || "",
        experienceYears: data.experienceYears || 0,
        specializationIds: Array.isArray(data.specializationIds) ? data.specializationIds.map(Number) : [],
        qualifications: Array.isArray(data.qualifications) ? data.qualifications : [],
        consultationModes: Array.isArray(data.consultationModes) ? data.consultationModes : [],
        availableDays: Array.isArray(data.availableDays) ? data.availableDays : [],
        feePkr: data.feePkr ? Number(data.feePkr) : undefined,
        openingTime: data.openingTime || undefined,
        closingTime: data.closingTime || undefined,
        image: undefined,
      };

      if (data.image) setImagePreviewUrl(data.image);
      form.reset(formData);
    }
  }, [savedData, loadingSavedData, form]);

  const onSubmit = (data: DoctorFormValues) => {
    // Validate qualifications array
    if (!data.qualifications || data.qualifications.length === 0) {
      form.setError("qualifications", { type: "manual", message: "At least one qualification is required" });
      return;
    }
    const onboardingData: DoctorOnboardingRequest = {
      gender: data.gender,
      mobile: data.mobile,
      specializationIds: data.specializationIds,
      qualifications: data.qualifications,
      experienceYears: data.experienceYears,
      address: data.address,
      image: data.image ? URL.createObjectURL(data.image) : undefined,
      feePkr: data.feePkr,
      consultationModes: data.consultationModes,
      openingTime: data.openingTime,
      closingTime: data.closingTime,
      availableDays: data.availableDays,
    };

    doctorOnboardingMutation.mutate(onboardingData);
  };

  const qualifications = form.watch("qualifications");
  const specializations = form.watch("specializationIds");
  const consultationModes = form.watch("consultationModes");

  const handleAddQualification = () => {
    if (qualificationInput.trim()) {
      form.setValue("qualifications", [...qualifications, qualificationInput.trim()], { shouldValidate: true });
      setQualificationInput("");
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      form.setValue("image", file);
    }
  };

  // Update URL with current step
  const updateStepInURL = (newStep: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', newStep.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const nextStep = async () => {
    if (step === 1) {
      const fieldsToValidate = ['gender', 'mobile'];
      const isValid = await form.trigger(fieldsToValidate as any);
      if (!isValid) {
        return; // Stop if validation fails
      }
      
      // Auto-save step 1 data (include existing step 2 data to preserve it)
      const currentData = form.getValues();
      const saveData: any = {
        gender: currentData.gender,
        mobile: currentData.mobile,
        address: currentData.address,
        image: currentData.image ? URL.createObjectURL(currentData.image) : undefined,
      };
      
      // Include step 2 fields only if they have values (preserves existing data)
      if (currentData.specializationIds?.length > 0) saveData.specializationIds = currentData.specializationIds;
      if (currentData.qualifications?.length > 0) saveData.qualifications = currentData.qualifications;
      if (currentData.experienceYears) saveData.experienceYears = currentData.experienceYears;
      if (currentData.feePkr) saveData.feePkr = currentData.feePkr;
      if (currentData.consultationModes?.length > 0) saveData.consultationModes = currentData.consultationModes;
      if (currentData.availableDays?.length > 0) saveData.availableDays = currentData.availableDays;
      if (currentData.openingTime) saveData.openingTime = currentData.openingTime;
      if (currentData.closingTime) saveData.closingTime = currentData.closingTime;
      
      await doctorOnboardingMutation.mutateAsync(saveData as DoctorOnboardingRequest);
      
      setStep(2);
      updateStepInURL(2);
    } else if (step === 2) {
      const fieldsToValidate = ['specializationIds', 'qualifications', 'experienceYears', 'feePkr', 'consultationModes', 'availableDays'];
      const isValid = await form.trigger(fieldsToValidate as any);
      if (!isValid) {
        return; // Stop if validation fails
      }
      setStep(3);
      updateStepInURL(3);
    }
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
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Doctor Information</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Provide your professional details to get started
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <User className="h-3.5 w-3.5 text-primary" />
                        Gender
                      </Label>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select your gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobile"
                  rules={{
                    required: "Phone number is required",
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: "Phone number must be exactly 10 digits",
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        Mobile Number
                      </Label>
                      <FormControl>
                        <div className="flex items-center space-x-0">
                          <span className="px-2.5 py-1.5 bg-muted border border-r-0 border-border rounded-l-md text-muted-foreground text-sm font-medium">
                            +92
                          </span>
                          <Input
                            type="tel"
                            inputMode="numeric"
                            placeholder="Enter mobile number"
                            {...field}
                            maxLength={10}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, "");
                              field.onChange(value);
                            }}
                            className="rounded-l-none h-9"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          Address
                        </Label>
                        <FormControl>
                          <Input placeholder="Enter your address" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label htmlFor="image" className="flex items-center gap-1.5 text-sm font-medium">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  Doctor Image
                </Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="h-9"
                />
                <div className="w-20 h-20 rounded-md overflow-hidden flex items-center justify-center border-2 border-border bg-muted">
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="text-muted-foreground h-6 w-6" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <div className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-primary/10 rounded-md">
                    <Stethoscope className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">Professional Details</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                      Please provide your professional credentials for verification
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="specializationIds"
                  rules={{
                    validate: (value) =>
                      value && value.length > 0 ? true : "At least one specialization is required"
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Stethoscope className="h-3.5 w-3.5 text-primary" />
                        Specializations (Select multiple)
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">Choose all your areas of expertise</p>
                      <FormControl>
                        <ReactSelect
                          isMulti
                          options={availableSpecializations.map((spec: Specialization) => ({
                            value: spec.id,
                            label: spec.name
                          }))}
                          value={availableSpecializations
                            .filter((spec: Specialization) => specializations.includes(spec.id))
                            .map((spec: Specialization) => ({
                              value: spec.id,
                              label: spec.name
                            }))}
                          onChange={(selectedOptions) => {
                            const values = selectedOptions ? selectedOptions.map(option => option.value) : [];
                            form.setValue("specializationIds", values, { shouldValidate: true });
                          }}
                          isLoading={specializationsLoading}
                          placeholder="Select your specializations..."
                          className="react-select-container"
                          classNamePrefix="react-select"
                          styles={{
                            control: (provided) => ({
                              ...provided,
                              minHeight: '36px',
                              borderColor: '#d1d5db',
                              '&:hover': {
                                borderColor: '#9ca3af'
                              }
                            }),
                            multiValue: (provided) => ({
                              ...provided,
                              backgroundColor: '#f3f4f6',
                              borderRadius: '6px'
                            }),
                            multiValueLabel: (provided) => ({
                              ...provided,
                              color: '#374151',
                              fontSize: '14px'
                            }),
                            multiValueRemove: (provided) => ({
                              ...provided,
                              color: '#6b7280',
                              '&:hover': {
                                backgroundColor: '#ef4444',
                                color: 'white'
                              }
                            })
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <Label className="text-base font-semibold text-foreground">Qualifications</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={qualificationInput}
                      onChange={(e) => setQualificationInput(e.target.value)}
                      placeholder="Add Qualification (e.g., MBBS, MD)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddQualification();
                        }
                      }}
                      className="h-9"
                    />
                    <Button type="button" onClick={handleAddQualification} variant="default" size="icon" className="h-9 w-9">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {qualifications.map((q) => (
                      <Badge key={q} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                        {q}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
                          onClick={() => {
                            const updated = qualifications.filter((_, i) => i !== qualifications.indexOf(q));
                            form.setValue("qualifications", updated);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                  {form.formState.errors.qualifications && (
                    <p className="text-destructive text-sm">{form.formState.errors.qualifications.message}</p>
                  )}
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="experienceYears"
                    rules={{
                      required: "Experience is required",
                      min: {
                        value: 1,
                        message: "Experience must be at least 1 year"
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          Years of Experience
                        </Label>
                        <FormControl>
                          <Input type="number" placeholder="Years of Experience" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="feePkr"
                    rules={{
                      required: "Consultation fee is required",
                      min: {
                        value: 1,
                        message: "Fee must be greater than 0"
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                          <Pill className="h-3.5 w-3.5 text-primary" />
                          Consultation Fee (PKR)
                        </Label>
                        <FormControl>
                          <Input type="number" placeholder="Fee in PKR" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                <FormField
                  control={form.control}
                  name="consultationModes"
                  rules={{
                    validate: (value) =>
                      value && value.length > 0 ? true : "Select at least one consultation mode"
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-primary" />
                          Consultation Modes
                        </Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/30">
                            <FormControl>
                              <Checkbox
                                checked={field.value.includes("inperson")}
                                onCheckedChange={(checked: boolean) => {
                                  return checked
                                    ? field.onChange([...field.value, "inperson"])
                                    : field.onChange(
                                      field.value.filter(
                                        (value) => value !== "inperson"
                                      )
                                    );
                                }}
                              />
                            </FormControl>
                            <Label className="text-sm font-medium cursor-pointer">In-Person Consultation</Label>
                          </div>
                          <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/30">
                            <FormControl>
                              <Checkbox
                                checked={field.value.includes("online")}
                                onCheckedChange={(checked: boolean) => {
                                  return checked
                                    ? field.onChange([...field.value, "online"])
                                    : field.onChange(
                                      field.value.filter(
                                        (value) => value !== "online"
                                      )
                                    );
                                }}
                              />
                            </FormControl>
                            <Label className="text-sm font-medium cursor-pointer">Online Consultation</Label>
                          </div>
                        </div>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="openingTime"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          Opening Time
                        </Label>
                        <FormControl>
                          <Input type="time" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="closingTime"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          Closing Time
                        </Label>
                        <FormControl>
                          <Input type="time" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                <FormField
                  control={form.control}
                  name="availableDays"
                  rules={{
                    validate: (value) =>
                      value && value.length > 0 ? true : "Select at least one available day"
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-primary" />
                          Available Days
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                            <div key={day} className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/30">
                              <FormControl>
                                <Checkbox
                                  checked={field.value.includes(day)}
                                  onCheckedChange={(checked: boolean) => {
                                    return checked
                                      ? field.onChange([...field.value, day])
                                      : field.onChange(
                                        field.value.filter(
                                          (value) => value !== day
                                        )
                                      );
                                  }}
                                />
                              </FormControl>
                              <Label className="text-sm font-medium cursor-pointer">{day}</Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <OnboardingPage
          step={step}
          maxSteps={2}
          title="Doctor Onboarding"
          onBack={step > 1 ? prevStep : undefined}
          onNext={step < 2 ? nextStep : undefined}
          onSubmit={step === 2 ? form.handleSubmit(onSubmit) : undefined}
          isSubmitting={doctorOnboardingMutation.isPending}
        >
          {getStepFields(step)}
        </OnboardingPage>
      </form>
    </Form>
  );
}
