"use client";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useDoctorOnboarding } from "@/hooks/use-onboarding";
import { DoctorOnboardingRequest, DoctorFormValues } from "@/lib/types";
import { useSpecializations } from "@/hooks/use-doctor";
import { Specialization } from "@/lib/doctor-api";
import ReactSelect from "react-select";
import {
  User,
  Mail,
  Phone,
  Calendar,
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


// Mocked components for this single-file example
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Select = ({ children, ...props }: SelectProps) => <select className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus:ring-blue-300" {...props}>{children}</select>;

const Checkbox = ({ checked, onCheckedChange, ...props }: CheckboxProps) => <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} className="h-4 w-4 shrink-0 rounded-sm border border-gray-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-gray-900 data-[state=checked]:text-gray-50 dark:border-gray-50 dark:data-[state=checked]:bg-gray-50 dark:data-[state=checked]:text-gray-900" {...props} />;


// Form data type - now imported from @/lib/types

export default function DoctorOnboarding() {
  const [step, setStep] = useState(1);
  const [qualificationInput, setQualificationInput] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const doctorOnboardingMutation = useDoctorOnboarding();

  // Fetch specializations from API
  const { data: specializationsData, isLoading: specializationsLoading } = useSpecializations();
  const availableSpecializations = (specializationsData as any)?.data || [];

  const form = useForm<DoctorFormValues>({
    defaultValues: {
      gender: "male",
      mobile: "",
      specializationIds: [],
      qualifications: [],
      experienceYears: 0,
      address: "",
      feePkr: undefined,
      consultationModes: [],
    },
    mode: "onChange",
  });

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


  const nextStep = async () => {
    if (step === 1) {
      const fieldsToValidate = ['gender', 'mobile'];
      const isValid = await form.trigger(fieldsToValidate as any);
      if (isValid) {
        setStep(2);
      }
    } else if (step === 2) {
      const fieldsToValidate = ['specializationIds', 'qualifications', 'experienceYears'];
      const isValid = await form.trigger(fieldsToValidate as any);
      if (isValid) {
        setStep(3);
      }
    }
  };

  const navLinks = [
    { id: 1, name: "Doctor details", description: "Basic information of doctor" },
    { id: 2, name: "Professional details", description: "Doctor's career background" },
  ];

  const getStepFields = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <h2 className="text-2xl font-bold mb-4">Doctor Info</h2>
            <p className="text-gray-500 mb-6">Provide your professional details to get started.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Gender
                    </Label>
                    <FormControl>
                      <Select {...field}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </Select>
                    </FormControl>
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
                    <Label>Mobile Number</Label>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-700">
                          +92
                        </span>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder="Enter mobile number"
                          {...field}
                          maxLength={10}
                          onChange={(e) => {
                            // only digits allow
                            const value = e.target.value.replace(/[^0-9]/g, "");
                            field.onChange(value);
                          }}
                          className="rounded-l-none"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </Label>
                    <FormControl>
                      <Input placeholder="Address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mt-4">
              <Label htmlFor="image" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Doctor Image
              </Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-2"
              />
              <div className="mt-4 w-24 h-24 rounded-md overflow-hidden flex items-center justify-center border-2 border-gray-300 bg-gray-200">
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="text-gray-500 h-8 w-8" />
                )}
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-2xl font-bold mb-4">Professional Details</h2>
            <p className="text-gray-500 mb-6">Please provide your professional credentials for verification.</p>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="specializationIds"
                rules={{
                  validate: (value) =>
                    value && value.length > 0 ? true : "At least one specialization is required"
                }}
                render={({ field }) => (
                  <FormItem>
                    <Label className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Specializations (Select multiple)
                    </Label>
                    <p className="text-sm text-gray-500 mb-2">Choose all your areas of expertise</p>
                    <FormControl>
                      <ReactSelect
                        isMulti
                        options={availableSpecializations.map((spec: Specialization) => ({
                          value: spec.name,
                          label: spec.name
                        }))}
                        value={specializations.map((spec: string) => ({
                          value: spec,
                          label: spec
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
                            minHeight: '40px',
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
              <div>
                <Label htmlFor="qualifications" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Qualifications
                </Label>
                <div className="flex gap-2 mt-3">
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
                  />
                  <Button type="button" onClick={handleAddQualification} variant="default" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {qualifications.map((q) => (
                    <Badge key={q} variant="outline" className="flex items-center gap-1">
                      {q}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                        onClick={() => {
                          const updated = qualifications.filter((_, i) => i !== qualifications.indexOf(q));
                          form.setValue("qualifications", updated);
                        }}
                      />
                    </Badge>
                  ))}
                </div>
                {/* Validation for qualifications */}
                {form.formState.errors.qualifications && <p className="text-red-500 text-sm mt-1">{form.formState.errors.qualifications.message}</p>}
              </div>
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
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Years of Experience
                      </Label>
                      <FormControl>
                        <Input type="number" placeholder="Years of Experience" {...field} />
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
                      <Label className="flex items-center gap-2">
                        <Pill className="h-4 w-4" />
                        Consultation Fee (PKR)
                      </Label>
                      <FormControl>
                        <Input type="number" placeholder="Fee in PKR" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="consultationModes"
                rules={{
                  validate: (value) =>
                    value && value.length > 0 ? true : "Select at least one consultation mode"
                }}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Consultation Modes
                      </Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value.includes("inperson")}
                              onCheckedChange={(checked) => {
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
                          <Label>In-Person Consultation</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value.includes("online")}
                              onCheckedChange={(checked) => {
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
                          <Label>Online Consultation</Label>
                        </div>
                      </div>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100 font-sans">
      {/* Sidebar for navigation, hidden on small screens */}
      <div className="hidden md:flex w-full md:w-1/4 min-w-[280px] bg-[#1a237e] text-white p-6 flex-col justify-between">
        <div className="flex-grow">
          <div className="flex items-center mb-6 md:mb-10">
            <Pill className="w-8 h-8 mr-2 text-white" />
            <span className="text-2xl font-bold">PillSure</span>
          </div>
          <nav className="space-y-4 md:space-y-6">
            {navLinks.map((link) => (
              <div key={link.id} onClick={() => setStep(link.id)} className={`flex items-center space-x-4 cursor-pointer p-3 rounded-lg transition-colors ${step === link.id ? 'bg-[#3949ab]' : 'hover:bg-[#283593]'}`}>
                {link.id === 1 ? (
                  <User className="w-6 h-6" />
                ) : (
                  <Stethoscope className="w-6 h-6" />
                )}
                <div>
                  <div className="text-lg font-medium">{link.name}</div>
                  <p className="text-sm text-gray-400">{link.description}</p>
                </div>
              </div>
            ))}
          </nav>
        </div>
        <div className="text-xs text-gray-400 mt-6 md:mt-0">
          © All rights reserved PillSure
        </div>
      </div>

      {/* Main content area */}
      <div className="w-full md:w-3/4 flex justify-center p-6 md:p-10">
        <div className="w-full max-w-2xl">
          <p className="text-sm text-blue-600 font-semibold mb-2">Step {step}/2</p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  {getStepFields(step)}
                </motion.div>
              </AnimatePresence>
              {/* Buttons moved outside of the AnimatePresence component */}
              <div className="flex gap-4 mt-6">
                {step > 1 && (
                  <Button type="button" variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">
                    Back
                  </Button>
                )}
                {step < 2 && (
                  <Button type="button" onClick={nextStep} variant="default" className="flex-1 w-3">
                    Next
                  </Button>
                )}
                {step === 2 && (
                  <Button
                    type="submit"
                    variant="default"
                    className="flex-1"
                    disabled={doctorOnboardingMutation.isPending}
                  >
                    {doctorOnboardingMutation.isPending ? "Creating Profile..." : "Submit"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
