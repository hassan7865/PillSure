"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { usePatientOnboarding } from "@/hooks/use-onboarding";
import { PatientOnboardingRequest, PatientFormValues } from "@/lib/types";
import {
  User,
  Heart,
  MapPin,
  Phone,
  Mail,
  Droplets,
  Shield,
  Plus,
  X,
  Pill,
  Calendar as CalendarIcon
} from "lucide-react";


// Shadcn UI components (mocked for this single-file example)
// Type definitions for component props
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  value: string;
}

const Select = ({ children, ...props }: SelectProps) => <select className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus:ring-blue-300" {...props}>{children}</select>;
const SelectItem = ({ children, value, ...props }: SelectItemProps) => <option value={value} {...props}>{children}</option>;
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}
const Checkbox = ({ checked, onCheckedChange, ...props }: CheckboxProps) => <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} className="h-4 w-4 shrink-0 rounded-sm border border-gray-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-gray-900 data-[state=checked]:text-gray-50 dark:border-gray-50 dark:data-[state=checked]:bg-gray-50 dark:data-[state=checked]:text-gray-900" {...props} />;


// Form data type - now imported from @/lib/types

export default function PatientOnboarding() {
  const [step, setStep] = useState(1);
  const [pastMedicalHistoryInput, setPastMedicalHistoryInput] = useState("");
  const patientOnboardingMutation = usePatientOnboarding();

  const form = useForm<PatientFormValues>({
    defaultValues: {
      gender: "male", // 
      mobile: "",
      dateOfBirth: "",
      address: "",
      bloodGroup: "",
      hasCovid: false,
      pastMedicalHistory: [],
      surgicalHistory: "",
      allergies: "",
    },
    mode: "onChange"
  });

  const onSubmit = (data: PatientFormValues) => {
    const onboardingData: PatientOnboardingRequest = {
      gender: data.gender,
      mobile: data.mobile,
      dateOfBirth: data.dateOfBirth,
      address: data.address,
      bloodGroup: data.bloodGroup,
      hasCovid: data.hasCovid,
      pastMedicalHistory: data.pastMedicalHistory,
      surgicalHistory: data.surgicalHistory,
      allergies: data.allergies,
    };

    patientOnboardingMutation.mutate(onboardingData);
  };

  const pastMedicalHistory = form.watch("pastMedicalHistory");

  const handleAddMedicalHistory = () => {
    if (pastMedicalHistoryInput.trim()) {
      form.setValue("pastMedicalHistory", [...(pastMedicalHistory || []), pastMedicalHistoryInput.trim()]);
      setPastMedicalHistoryInput("");
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = ['gender', 'mobile', 'dateOfBirth', 'address', 'bloodGroup'];
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setStep(2);
    }
  };

  const navLinks = [
    { id: 1, name: "Patient details", description: "Basic information of patient" },
    { id: 2, name: "Medical details", description: "Patient's medical history" },
  ];

  const getStepFields = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <h2 className="text-2xl font-bold mb-4">Patient Info</h2>
            <p className="text-gray-500 mb-6">Provide your personal details to get started.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <SelectItem value="" disabled>Select Gender</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                rules={{
                  required: "date of birth is required"
                }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Label>
                      Date of Birth
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className=
                            " justify-start text-left font-normal rounded-l-md shadow-sm"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-600" />
                            {field.value ? (
                              new Date(field.value).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            ) : (
                              <span>Select date of birth</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date)}
                          disabled={(date) => date > new Date()}
                          captionLayout="dropdown" //  year & month dropdown
                          fromYear={1900}          //  start year
                          toYear={new Date().getFullYear()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
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
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-2xl font-bold mb-4">Medical Details</h2>
            <p className="text-gray-500 mb-6">Please provide your medical history for our records.</p>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="bloodGroup"
                rules={{
                  required: "Blood group is required"
                }}
                render={({ field }) => (
                  <FormItem>
                    <Label className="flex items-center gap-2">
                      <Droplets className="h-4 w-4" />
                      Blood Group
                    </Label>
                    <FormControl>
                      <Select onChange={field.onChange} value={field.value}>
                        <SelectItem value="" disabled>Select Blood Group</SelectItem>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hasCovid"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Do you have Covid?
                    </Label>
                  </FormItem>
                )}
              />
              <div>
                <Label className="pb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Past Medical History
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={pastMedicalHistoryInput}
                    onChange={(e) => setPastMedicalHistoryInput(e.target.value)}
                    placeholder="Add Past Medical History (e.g., Diabetes)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMedicalHistory();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddMedicalHistory} variant="default" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pastMedicalHistory?.map((item, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {item}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                        onClick={() => {
                          const updated = pastMedicalHistory.filter((_, i) => i !== index);
                          form.setValue("pastMedicalHistory", updated);
                        }}
                      />
                    </Badge>
                  ))}
                </div>
                {form.formState.errors.pastMedicalHistory && <p className="text-red-500 text-sm mt-1">{form.formState.errors.pastMedicalHistory.message}</p>}
              </div>
              <FormField
                control={form.control}
                name="surgicalHistory"
                rules={{
                  maxLength: {
                    value: 100,
                    message: "Surgical history must be less than 100 characters"
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <Label className="flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Surgical History
                    </Label>
                    <FormControl>
                      <Input placeholder="Surgical History (if any)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allergies"
                rules={{
                  maxLength: {
                    value: 100,
                    message: "Allergies must be less than 100 characters"
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Allergies
                    </Label>
                    <FormControl>
                      <Input placeholder="Allergies (if any)" {...field} />
                    </FormControl>
                    <FormMessage />
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
      <div className="hidden md:flex md:w-1/4 min-w-[280px] bg-[#1a237e] text-white p-6 flex-col justify-between">
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
                  <Heart className="w-6 h-6" />
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

      <div className="w-full md:w-3/4 flex justify-center p-6 md:p-10">
        <div className="w-full max-w-2xl">
          <p className="text-sm text-blue-600 font-semibold mb-2">Step {step}/2</p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative">
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
              <div className="mt-8 flex gap-4">
                {step > 1 && (
                  <Button type="button" variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">
                    Back
                  </Button>
                )}
                {step < 2 && (
                  <Button type="button" onClick={nextStep} variant="default" className="flex-1">
                    Next
                  </Button>
                )}
                {step === 2 && (
                  <Button
                    type="submit"
                    variant="default"
                    className="flex-1"
                    disabled={patientOnboardingMutation.isPending}
                  >
                    {patientOnboardingMutation.isPending ? "Creating Profile..." : "Submit"}
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

