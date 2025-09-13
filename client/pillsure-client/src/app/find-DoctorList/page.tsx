"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mic ,RotateCcw} from "lucide-react";
import DoctorCard from "./component/doctorCard";
import MultiSelect from "@/components/ui/multi-select";

export default function FindDoctorPage() {
  const [search, setSearch] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);

  const doctors = [
    {
      id: 1,
      name: "Dr Sophia Riz",
      specialization: "Gynecologist",
      experience: 7,
      status: "Available" as const,
      fee: 20,
      rating: 4.8,
      image: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      id: 2,
      name: "Dr Maria Carter",
      specialization: "Dermatologist",
      experience: 6,
      status: "Available" as const,
      fee: 25,
      rating: 4.9,
      image: "https://randomuser.me/api/portraits/women/65.jpg",
    },
    {
      id: 3,
      name: "Dr John Smith",
      specialization: "Cardiologist",
      experience: 10,
      status: "Not Available",
      fee: 40,
      rating: 4.7,
      image: "https://randomuser.me/api/portraits/men/31.jpg",
    },
    {
      id: 4,
      name: "Dr Ali Khan",
      specialization: "Neurologist",
      experience: 8,
      status: "Available",
      fee: 35,
      rating: 4.6,
      image: "https://randomuser.me/api/portraits/men/55.jpg",
    },
    {
      id: 5,
      name: "Dr Sarah Lee",
      specialization: "Pediatrician",
      experience: 5,
      status: "Not Available",
      fee: 22,
      rating: 4.5,
      image: "https://randomuser.me/api/portraits/women/72.jpg",
    },
    {
      id: 6,
      name: "Dr Michael Brown",
      specialization: "General Physician",
      experience: 12,
      status: "Available",
      fee: 18,
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
    <div className="min-h-screen bg-gray-50">
      {/*Sticky Search + Filters + Clear */}
      <div className="sticky top-0 bg-gray-50 p-4 z-10 border-b shadow-sm space-y-3">
        {/* Search + MultiSelect in one row */}
        <div className="flex items-center gap-2">
          {/* Search box - 70% */}
          <div className="relative w-[60%]">
            <Input
              type="text"
              placeholder="Search doctors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 rounded-full text-[#1a237e]"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-[#1a237e]" />
            <Mic className="absolute right-3 top-2.5 h-5 w-5 text-[#1a237e]" />
          </div>

          {/* MultiSelect - 30% */}
          <div className="w-[37%]">
            <MultiSelect 
              options={specializations.map((spec) => ({ value: spec, label: spec }))}
              selected={selectedSpecializations}
              onSelect={setSelectedSpecializations}
              placeholder="Specialization"
              className="w-full"
            />
          </div>
          
        {/* Clear Button */}
          <div className="m-3 flex justify-end">
            <Button
              onClick={clearFilters}
              size="sm"
              variant="default"
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>
      {/* Doctor Cards */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {doctors.map((doc) => (
          <DoctorCard key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  );
}
