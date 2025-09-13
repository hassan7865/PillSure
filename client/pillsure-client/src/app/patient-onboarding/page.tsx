"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";


// Shadcn UI components (mocked for this single-file example)
// Type definitions for component props
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  value: string;
}

const Select = ({ children, ...props }: SelectProps) => <select className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus:ring-blue-300" {...props}>{children}</select>;
const SelectItem = ({ children, value, ...props }: SelectItemProps) => <option value={value} className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-gray-100 focus:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-gray-800 dark:focus:text-gray-50" {...props}>{children}</option>;
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}
const Checkbox = ({ checked, onCheckedChange, ...props }: CheckboxProps) => <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} className="h-4 w-4 shrink-0 rounded-sm border border-gray-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-gray-900 data-[state=checked]:text-gray-50 dark:border-gray-50 dark:data-[state=checked]:bg-gray-50 dark:data-[state=checked]:text-gray-900" {...props} />;


// Validation Schema
const patientSchema = z.object({
  patientName: z.string().min(2, "Patient name is required"),
  email: z.string().email("Invalid email"),
  gender: z.enum(["male", "female", "other"], { message: "Gender is required" }),
  mobile: z.string().min(10, "Mobile number required"),
  dateOfBirth: z.string().nonempty("Date of birth is required"),
  address: z.string().min(5, "Address is required"),
  
  bloodGroup: z.string().nonempty("Blood group is required"),
  hasCovid: z.boolean().optional(),
  pastMedicalHistory: z.array(z.string()).optional(),
  surgicalHistory: z.string().optional(),
  allergies: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

export default function PatientOnboarding() {
  const [step, setStep] = useState(1);
  const [pastMedicalHistoryInput, setPastMedicalHistoryInput] = useState("");
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      patientName: "",
      email: "",
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
    mode : "onChange"
  });

  const onSubmit = (data: PatientFormValues) => {
    console.log("Patient Form Submitted:", data);
  };

  const pastMedicalHistory = form.watch("pastMedicalHistory");

  const handleAddMedicalHistory = () => {
    if (pastMedicalHistoryInput.trim()) {
      form.setValue("pastMedicalHistory", [...(pastMedicalHistory || []), pastMedicalHistoryInput.trim()]);
      setPastMedicalHistoryInput("");
    }
  };
  
  const nextStep = async () => {
    const fieldsToValidate = ['patientName', 'email', 'gender', 'mobile', 'dateOfBirth', 'address'];
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
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <Label>Patient Name</Label>
                    <FormControl>
                      <Input  id="patientName" placeholder="Patient Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label>Email</Label>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <Label>Mobile Number</Label>
                    <FormControl>
                      <Input type="tel" placeholder="Mobile Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <Label>Date of Birth</Label>
                    <FormControl>
                      <Input type="date" placeholder="Date of Birth" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <Label>Gender</Label>
                    <FormControl>
                      <Select onChange={field.onChange} value={field.value}>
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
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Address</Label>
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
                render={({ field }) => (
                  <FormItem>
                    <Label>Blood Group</Label>
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
                    <Label className="text-sm font-medium text-gray-700">Do you have Covid?</Label>
                  </FormItem>
                )}
              />
              <div>
                <Label className="pb-2">Past Medical History</Label>
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
                  <Button type="button" onClick={handleAddMedicalHistory} variant="default">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pastMedicalHistory?.map((item, index) => (
                    <Badge key={index} variant="outline">{item}</Badge>
                  ))}
                </div>
                {form.formState.errors.pastMedicalHistory && <p className="text-red-500 text-sm mt-1">{form.formState.errors.pastMedicalHistory.message}</p>}
              </div>
              <FormField
                control={form.control}
                name="surgicalHistory"
                render={({ field }) => (
                  <FormItem>
                    <Label>Surgical History</Label>
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
                render={({ field }) => (
                  <FormItem>
                    <Label>Allergies</Label>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pill-bottle-0 w-8 h-8 mr-2 text-white"><path d="M15 4a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v2a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1a2 2 0 0 0 2 2h4c1.1 0 2-.9 2-2v-6a2 2 0 0 0-2-2V4Z"/><path d="M8 8h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2Z"/></svg>
            <span className="text-2xl font-bold">PillSure</span>
          </div>
          <nav className="space-y-4 md:space-y-6">
            {navLinks.map((link) => (
              <div key={link.id} onClick={() => setStep(link.id)} className={`flex items-center space-x-4 cursor-pointer p-3 rounded-lg transition-colors ${step === link.id ? 'bg-[#3949ab]' : 'hover:bg-[#283593]'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  {link.id === 1 && (
                    <g>
                      <path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/>
                      <path d="M17 12a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/>
                      <path d="M7 12a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/>
                    </g>
                  )}
                  {link.id === 2 && (
                    <g>
                      <path d="M22 10s-2-2-6-2-6 2-6 2"/>
                      <path d="M22 10v12c0 1-2 2-6 2s-6-1-6-2V10"/>
                      <path d="M16 8v6"/>
                      <path d="M16 17v2"/>
                    </g>
                  )}
                </svg>
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
                  <Button type="submit" variant="default" className="flex-1">
                    Submit
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

