"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, Filter, MapPin, Users } from "lucide-react";
import DoctorCard from "./component/doctorCard";
import MultiSelect from "@/components/ui/multi-select";
import PublicLayout from "@/layout/PublicLayout";
import { useSpecializations, useDoctors } from "@/hooks/use-doctor";
import { Doctor } from "@/lib/types";
import Loader from "@/components/ui/loader";

export default function FindDoctorPage() {
  const [search, setSearch] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch specializations
  const { data: specializations = [], isLoading: specializationsLoading } = useSpecializations();

  // Fetch doctors with search and filters
  const { 
    data: doctorsData, 
    isLoading: doctorsLoading, 
    error: doctorsError 
  } = useDoctors(page, 12, selectedSpecializations, debouncedSearch);

  // Update allDoctors when new data arrives
  useEffect(() => {
    if (doctorsData?.doctors) {
      if (page === 1) {
        // Reset doctors list for new search/filter
        setAllDoctors(doctorsData.doctors);
      } else {
        // Append new doctors for "Load More"
        setAllDoctors(prev => [...prev, ...doctorsData.doctors]);
      }
    }
  }, [doctorsData, page]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedSpecializations]);

  // Reset doctors array when page changes to 1 (new search/filter)
  useEffect(() => {
    if (page === 1) {
      setAllDoctors([]);
    }
  }, [page]);

  const doctors = allDoctors;
  const pagination = doctorsData?.pagination;

  const clearFilters = () => {
    setSearch("");
    setSelectedSpecializations([]);
    setPage(1);
    setAllDoctors([]);
  };

  const handleSpecializationChange = (specializations: string[]) => {
    setSelectedSpecializations(specializations);
    setPage(1); // Reset to first page when filters change
    setAllDoctors([]);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        {/* Responsive Header */}
        <div className="border-b border-border/50 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
            {/* Mobile: Stacked layout, Desktop: Side by side */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 mb-4 md:mb-6">
              <div className="text-center md:text-left">
                <h1 className="text-lg md:text-xl font-semibold text-foreground">Find Doctors</h1>
                <p className="text-xs md:text-sm text-muted-foreground">Search by name or specialization</p>
              </div>
            </div>
            
            {/* Responsive Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search doctors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 md:h-11 bg-white border-border/50 text-sm md:text-base"
                />
              </div>
              <div className="w-full sm:w-64 md:w-72">
                <MultiSelect
                  options={specializations.map((spec) => ({
                    value: spec.id.toString(),
                    label: spec.name,
                  }))}
                  selected={selectedSpecializations}
                  onSelect={handleSpecializationChange}
                  placeholder={specializationsLoading ? "Loading..." : "Specializations"}
                  className="w-full"
                />
              </div>
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="h-10 md:h-11 px-3 md:px-4 w-full sm:w-auto"
              >
                <RotateCcw className="w-4 h-4 mr-1 md:mr-2" />
                <span className="text-sm">Clear</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Responsive Results Section */}
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          {/* Responsive Results Header */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                {doctorsError ? (
                  "Error loading doctors"
                ) : (
                  <>
                    <span className="block sm:inline">{pagination?.total || doctors.length} doctors found</span>
                    {debouncedSearch && (
                      <span className="text-primary font-medium block sm:inline sm:ml-1"> for "{debouncedSearch}"</span>
                    )}
                    {selectedSpecializations.length > 0 && (
                      <span className="text-primary font-medium block sm:inline sm:ml-1"> in {selectedSpecializations.map(id => {
                        const spec = specializations.find(s => s.id.toString() === id);
                        return spec ? spec.name : id;
                      }).join(", ")}</span>
                    )}
                  </>
                )}
              </h2>
            </div>
          </div>

          {/* Responsive Loading State */}
          {doctorsLoading && (
            <div className="flex items-center justify-center py-12 md:py-16">
              <Loader 
                title="Finding Doctors"
                description="Searching through our network of qualified healthcare professionals..."
              />
            </div>
          )}

          {/* Responsive Error State */}
          {doctorsError && (
            <div className="flex items-center justify-center py-12 md:py-16">
              <div className="text-center bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-6 md:p-8 shadow-lg border border-white/20 max-w-sm md:max-w-md mx-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">Unable to Load Doctors</h3>
                <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">There was an issue connecting to our doctor database.</p>
                <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90 text-sm md:text-base px-4 md:px-6">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Responsive Doctor Cards Grid */}
          {!doctorsLoading && !doctorsError && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                {doctors.map((doc) => (
                  <DoctorCard key={doc.id} doc={doc} />
                ))}
              </div>

              {/* Responsive No Results */}
              {doctors.length === 0 && (
                <div className="flex items-center justify-center py-12 md:py-16">
                  <div className="text-center bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-6 md:p-8 shadow-lg border border-white/20 max-w-sm md:max-w-md mx-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                      <Search className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">No Doctors Found</h3>
                    <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                      We couldn't find any doctors matching your criteria. Try adjusting your search or filters.
                    </p>
                    <Button onClick={clearFilters} variant="outline" className="text-sm md:text-base px-4 md:px-6">
                      Clear Filters
                    </Button>
                  </div>
                </div>
              )}

              {/* Load More Pagination */}
              {pagination && pagination.hasNextPage && (
                <div className="flex items-center justify-center mt-8 md:mt-12">
                  <Button
                    onClick={handleLoadMore}
                    disabled={doctorsLoading}
                    className="px-8 md:px-12 py-3 md:py-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-semibold text-sm md:text-base transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {doctorsLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      "Load More Doctors"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
