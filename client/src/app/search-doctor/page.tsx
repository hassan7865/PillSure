"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw } from "lucide-react";
import DoctorCard from "./component/doctorCard";
import MultiSelect from "@/components/ui/multi-select";
import PublicLayout from "@/layout/PublicLayout";

export default function FindDoctorPage() {
  const [search, setSearch] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);

  const doctors = [
    {
      id: 1,
      name: "Dr Sophia Riz",
      specialization: "Gynecologist",
      experience: 7,
      fee: 2000,
      rating: 4.8,
      image: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      id: 2,
      name: "Dr Maria Carter",
      specialization: "Dermatologist",
      experience: 6,
      fee: 2500,
      rating: 4.9,
      image: "https://randomuser.me/api/portraits/women/65.jpg",
    },
    {
      id: 3,
      name: "Dr John Smith",
      specialization: "Cardiologist",
      experience: 10,
      fee: 4000,
      rating: 4.7,
      image: "https://randomuser.me/api/portraits/men/31.jpg",
    },
    {
      id: 4,
      name: "Dr Ali Khan",
      specialization: "Neurologist",
      experience: 8,
      fee: 3500,
      rating: 4.6,
      image: "https://randomuser.me/api/portraits/men/55.jpg",
    },
    {
      id: 5,
      name: "Dr Sarah Lee",
      specialization: "Pediatrician",
      experience: 5,
      fee: 2200,
      rating: 4.5,
      image: "https://randomuser.me/api/portraits/women/72.jpg",
    },
    {
      id: 6,
      name: "Dr Michael Brown",
      specialization: "General Physician",
      experience: 12,
      fee: 1800,
      rating: 4.3,
      image: "https://randomuser.me/api/portraits/men/29.jpg",
    },
  ];

  const specializations = [
    "Cardiologist",
    "Dermatologist", 
    "Neurologist",
    "Orthopedic",
    "Pediatrician",
    "General Physician",
    "Gynecologist",
  ];

  const clearFilters = () => {
    setSearch("");
    setSelectedSpecializations([]);
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-accent/5 py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-center text-primary mb-8">
              Find Your Doctor
            </h1>
            
            {/* Search and Filter Bar */}
            <div className="bg-card rounded-2xl p-6 shadow-lg border border-border/50">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Search doctors by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-12 pr-4 py-3 text-base rounded-xl border-primary/20 focus:border-primary bg-background"
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary" />
                </div>

                {/* Multi-Select */}
                <div className="sm:w-80">
                  <MultiSelect
                    options={specializations.map((spec) => ({
                      value: spec,
                      label: spec,
                    }))}
                    selected={selectedSpecializations}
                    onSelect={setSelectedSpecializations}
                    placeholder="Select Specializations"
                    className="w-full"
                  />
                </div>

                {/* Clear Button */}
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="px-6 py-3 rounded-xl border-primary/20 hover:bg-primary/5 text-primary font-semibold"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Available Doctors
              </h2>
              <p className="text-muted-foreground">
                {doctors.length} doctors found
                {search && ` for "${search}"`}
                {selectedSpecializations.length > 0 && ` in ${selectedSpecializations.join(", ")}`}
              </p>
            </div>

            {/* Doctor Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc) => (
                <DoctorCard key={doc.id} doc={doc} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
