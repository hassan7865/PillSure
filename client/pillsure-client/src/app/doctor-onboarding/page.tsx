"use client";
import { useState, useRef } from "react";
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


// Validation Schema for Doctor Onboarding
const doctorSchema = z.object({
  doctorName: z.string().min(2, "Doctor name is required"),
  email: z.string().email("Invalid email"),
  gender: z.enum(["male", "female", "other"], { message: "Gender is required" }),
  mobile: z.string().regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits"),
  image: z.any().optional(),

  specialization: z.array(z.string()).min(1, "Select at least one specialization"),
  qualifications: z.array(z.string()).min(1, "Add at least one qualification"),
  experience: z.number().min(0, "Experience must be a positive number"),
  consultationModes: z.array(z.string()).min(1, "Select at least one mode"),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

export default function DoctorOnboarding() {
  const [step, setStep] = useState(1);
  const [qualificationInput, setQualificationInput] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      doctorName: "",
      email: "",
      gender: "male",
      mobile: "",
      specialization: [],
      qualifications: [],
      experience: 0,
      consultationModes: [],
    },
    mode: "onChange",
  });

  const onSubmit = (data: DoctorFormValues) => {
    console.log("Doctor Form Submitted:", data);
  };

  const qualifications = form.watch("qualifications");
  const specialization = form.watch("specialization");
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

  const handleSelectSpecialization = (val: string) => {
    if (val && !specialization.includes(val)) {
      form.setValue("specialization", [...specialization, val], { shouldValidate: true });
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = ['doctorName', 'email', 'gender', 'mobile'];
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setStep(2);
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
                name="doctorName"
                render={({ field }) => (
                  <FormItem>
                    <Label>Doctor Name</Label>
                    <FormControl>
                      <Input id="doctorName" placeholder="Doctor Name" {...field} />
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
                      <Input id="email" type="email" placeholder="Email" {...field} />
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
                      <Input id="mobile" type="tel" placeholder="Mobile Number" {...field} />
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
                      <Select id="gender" onChange={field.onChange} value={field.value}>
                        <option value="" disabled>Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mt-4">
              <Label htmlFor="image">Doctor Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <div className="mt-4 w-24 h-24 rounded-md overflow-hidden flex items-center justify-center border-2 border-gray-300 bg-gray-200">
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-500 text-xs text-center">Image Preview</span>
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
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <Label>Specialization</Label>
                    <FormControl>
                      <div>
                        <Select id="specialization" onChange={(e) => handleSelectSpecialization(e.target.value)} value="">
                          <option value="" disabled>Select Specialization</option>
                          <option value="Cardiologist">Cardiologist</option>
                          <option value="Dermatologist">Dermatologist</option>
                          <option value="Neurologist">Neurologist</option>
                          <option value="Orthopedic">Orthopedic</option>
                          <option value="Pediatrician">Pediatrician</option>
                          <option value="General Physician">General Physician</option>
                        </Select>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {specialization.map((spec) => (
                            <Badge key={spec} variant="secondary">{spec}</Badge>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <Label htmlFor="qualifications">Qualifications</Label>
                <div className="flex gap-2">
                  <Input
                    id="qualifications"
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
                  <Button type="button" onClick={handleAddQualification} variant="default">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {qualifications.map((q) => (
                    <Badge key={q} variant="outline">{q}</Badge>
                  ))}
                </div>
                {form.formState.errors.qualifications && <p className="text-red-500 text-sm mt-1">{form.formState.errors.qualifications.message}</p>}
              </div>
              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <Label>Years of Experience</Label>
                    <FormControl>
                      <Input id="experience" type="number" placeholder="Years of Experience" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consultationModes"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Consultation Modes</Label>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pill-bottle-0 w-8 h-8 mr-2 text-white"><path d="M15 4a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v2a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1a2 2 0 0 0 2 2h4c1.1 0 2-.9 2-2v-6a2 2 0 0 0-2-2V4Z"/><path d="M8 8h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2Z"/></svg>
            <span className="text-2xl font-bold">PillSure</span>
          </div>
          <nav className="space-y-4 md:space-y-6">
            {navLinks.map((link) => (
              <div key={link.id} onClick={() => setStep(link.id)} className={`flex items-center space-x-4 cursor-pointer p-3 rounded-lg transition-colors ${step === link.id ? 'bg-[#3949ab]' : 'hover:bg-[#283593]'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  {link.id === 1 && (
                    <g>
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </g>
                  )}
                  {link.id === 2 && (
                    <g>
                      <path d="M12 21h7a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-5" />
                      <path d="M16 3a2 2 0 0 1 2 2" />
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="11.5" r="4.5" />
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
