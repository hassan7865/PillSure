"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form,FormControl,FormField,FormItem,FormLabel,FormMessage } from "@/components/ui/form";


// Validation Schema
const hospitalSchema = z.object({
  hospitalName: z.string().min(2, "Hospital name is required"),
  hospitalAddress: z.string().min(5, "Hospital address is required"),
  hospitalContactNo: z.string().min(10, "Hospital contact number required"),
  hospitalEmail: z.string().email("Invalid hospital email"),

  websiteHospital: z.string().optional(),
  licenseNo: z.string().nonempty("License number is required"),
  adminName: z.string().min(2, "Admin/Owner name is required"),
});

type HospitalFormValues = z.infer<typeof hospitalSchema>;

export default function App() {
  const [step, setStep] = useState(1);
  const form = useForm<HospitalFormValues>({
    resolver: zodResolver(hospitalSchema),
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

  const {
    handleSubmit,
    trigger,
    control,
    formState: { errors },
  } = form;

  const onSubmit = (data: HospitalFormValues) => {
    console.log("Hospital Form Submitted:", data);
  };

  const nextStep = async () => {
    const fieldsToValidate = ['hospitalName', 'hospitalAddress', 'hospitalContactNo', 'hospitalEmail'];
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setStep(2);
    }
  };

  // Refactored navLinks and getStepFields to be defined inside the component
  // for better encapsulation.
  const navLinks = [
    { id: 1, name: "Hospital details", description: "Basic information of hospital" },
    { id: 2, name: "Admin details", description: "Admin and licensing information" },
  ];

  const getStepFields = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <h2 className="text-2xl font-bold mb-4">Hospital Info</h2>
            <p className="text-gray-500 mb-6">Provide your hospital's details to get started.</p>
            {/* Updated layout to show two inputs per row on medium screens and up */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={control}
                name="hospitalName"
                render={({ field }) => (
                  <FormItem>
                    <Label>Hospital Name</Label>
                    <FormControl>
                      <Input placeholder="Hospital Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="hospitalAddress"
                render={({ field }) => (
                  <FormItem>
                    <Label>Hospital Address</Label>
                    <FormControl>
                      <Input placeholder="Hospital Address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="hospitalContactNo"
                render={({ field }) => (
                  <FormItem>
                    <Label>Hospital Contact No.</Label>
                    <FormControl>
                      <Input type="tel" placeholder="Hospital Contact No." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="hospitalEmail"
                render={({ field }) => (
                  <FormItem>
                    <Label>Hospital Email</Label>
                    <FormControl>
                      <Input type="email" placeholder="Hospital Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-2xl font-bold mb-4">Admin & Licensing Details</h2>
            <p className="text-gray-500 mb-6">Please provide licensing information for verification.</p>
            <div className="space-y-4">
              <FormField
                control={control}
                name="websiteHospital"
                render={({ field }) => (
                  <FormItem>
                    <Label>Hospital Website</Label>
                    <FormControl>
                      <Input placeholder="Website (Optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="licenseNo"
                render={({ field }) => (
                  <FormItem>
                    <Label>License No</Label>
                    <FormControl>
                      <Input placeholder="License Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="adminName"
                render={({ field }) => (
                  <FormItem>
                    <Label>Admin & Owner Name</Label>
                    <FormControl>
                      <Input placeholder="Admin / Owner Name" {...field} />
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
      {/* Sidebar for navigation, hidden on mobile */}
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
                      <path d="M2 13s.5-2 2-2 3 1 4 1 2-1 4-1 3 1 4 1 2-2 4-2"/>
                      <path d="M22 13v-1c-1.2-1.2-2.8-2-4.5-2-1.7 0-3.3.8-4.5 2"/>
                      <path d="M2 13v-1c1.2-1.2 2.8-2 4.5-2 1.7 0 3.3.8 4.5 2"/>
                    </g>
                  )}
                  {link.id === 2 && (
                    <g>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
      <div className="w-full md:w-3/4 flex justify-center p-6 md:p-10 pb-28 md:pb-10">
        <div className="w-full max-w-2xl">
          <p className="text-sm text-blue-600 font-semibold mb-2">Step {step}/2</p>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              {/* This div creates a fixed button bar at the bottom for mobile,
                  then becomes a regular relative-positioned element on larger screens (md breakpoint).
                */}
              <div className="fixed bottom-0 left-0 right-0 bg-white p-6 shadow-lg md:relative md:p-0 md:shadow-none">
                <div className="flex w-full gap-4">
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
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
