"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePatientOnboarding } from "../hooks/use-onboarding";
import { PatientOnboardingRequest, PatientFormValues } from "../_components/_types";
import OnboardingPage from "../_components/OnboardingPage";
import {
  User,
  Heart,
  MapPin,
  Phone,
  Droplets,
  Shield,
  Plus,
  X,
  Pill,
  Calendar as CalendarIcon
} from "lucide-react";

export default function PatientOnboarding() {
  const [step, setStep] = useState(1);
  const [pastMedicalHistoryInput, setPastMedicalHistoryInput] = useState("");
  const patientOnboardingMutation = usePatientOnboarding();

  const form = useForm<PatientFormValues>({
    defaultValues: {
      gender: "male",
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
                  <CardTitle className="text-lg text-foreground">Personal Information</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Let's start with your basic details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  rules={{
                    required: "Date of birth is required"
                  }}
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                        Date of Birth
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="h-9 justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              {field.value ? (
                                new Date(field.value).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              ) : (
                                <span className="text-muted-foreground text-sm">Select your date of birth</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date)}
                            disabled={(date) => date > new Date()}
                            captionLayout="dropdown"
                            fromYear={1900}
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
                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          Address
                        </Label>
                        <FormControl>
                          <Input 
                            placeholder="Enter your complete address" 
                            {...field} 
                            className="h-9"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">Medical Information</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                      Help us understand your medical background
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bloodGroup"
                    rules={{
                      required: "Blood group is required"
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                          <Droplets className="h-3.5 w-3.5 text-primary" />
                          Blood Group
                        </Label>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select your blood group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hasCovid"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0 p-3 border border-border rounded-lg bg-muted/30">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <Label className="text-sm font-medium text-foreground flex items-center gap-1.5 cursor-pointer">
                            <Shield className="h-3.5 w-3.5 text-primary" />
                            Have you been diagnosed with COVID-19?
                          </Label>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Heart className="h-4 w-4 text-primary" />
                    <Label className="text-base font-semibold text-foreground">Past Medical History</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={pastMedicalHistoryInput}
                      onChange={(e) => setPastMedicalHistoryInput(e.target.value)}
                      placeholder="Add medical condition (e.g., Diabetes, Hypertension)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMedicalHistory();
                        }
                      }}
                      className="h-9"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddMedicalHistory} 
                      variant="default" 
                      size="icon"
                      className="h-9 w-9"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {pastMedicalHistory?.map((item, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                        {item}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
                          onClick={() => {
                            const updated = pastMedicalHistory.filter((_, i) => i !== index);
                            form.setValue("pastMedicalHistory", updated);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                  {form.formState.errors.pastMedicalHistory && (
                    <p className="text-destructive text-sm">{form.formState.errors.pastMedicalHistory.message}</p>
                  )}
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                          <Pill className="h-3.5 w-3.5 text-primary" />
                          Surgical History
                        </Label>
                        <FormControl>
                          <Input 
                            placeholder="Any previous surgeries (optional)" 
                            {...field} 
                            className="h-9"
                          />
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
                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          Allergies
                        </Label>
                        <FormControl>
                          <Input 
                            placeholder="Known allergies (optional)" 
                            {...field} 
                            className="h-9"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
          title="Patient Onboarding"
          onBack={step > 1 ? () => setStep(step - 1) : undefined}
          onNext={step < 2 ? nextStep : undefined}
          onSubmit={step === 2 ? form.handleSubmit(onSubmit) : undefined}
          isSubmitting={patientOnboardingMutation.isPending}
        >
          {getStepFields(step)}
        </OnboardingPage>
      </form>
    </Form>
  );
}