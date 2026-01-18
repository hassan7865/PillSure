"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Star, MapPin, Stethoscope, Calendar, ArrowRight } from "lucide-react";
import { Doctor } from "@/lib/types";
import { useRouter } from "next/navigation";

interface RecommendedDoctorCardProps {
  doctor: Doctor;
  onViewProfile?: () => void;
}

export default function RecommendedDoctorCard({
  doctor,
  onViewProfile,
}: RecommendedDoctorCardProps) {
  const router = useRouter();

  // Use doctor's image if available, otherwise use fallback
  const doctorImage = doctor.image || "/logo.png";
  const rating = doctor.rating || parseFloat(doctor.patientSatisfactionRate || "0");

  const handleCardClick = () => {
    if (onViewProfile) {
      onViewProfile();
    } else {
      router.push(`/doctor/${doctor.id}`);
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-300 flex-shrink-0 w-[280px] sm:w-[300px] h-full"
      onClick={handleCardClick}
    >
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        {/* Doctor Image and Info */}
        <div className="flex gap-3">
          {/* Image */}
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
            <Image
              src={doctorImage}
              alt={doctor.name}
              fill
              className="object-cover"
              sizes="64px"
              unoptimized={doctor.image?.startsWith("http")}
            />
          </div>

          {/* Name and Specialization */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">
              Dr. {doctor.name}
            </h4>
            <div className="flex items-center gap-1 mt-1">
              <Stethoscope className="h-3 w-3 text-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground truncate">
                {doctor.specialization || "General"}
              </p>
            </div>
          </div>
        </div>

        {/* Rating and Experience */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{rating.toFixed(1)}</span>
          </div>
          <div className="text-muted-foreground">
            {doctor.experience} {doctor.experience === 1 ? "year" : "years"} exp.
          </div>
        </div>

        {/* Hospital/Location */}
        {doctor.hospital && (
          <div className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p className="line-clamp-2">{doctor.hospital.name}</p>
          </div>
        )}

        {/* Fee */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t">
          <div>
            <span className="text-lg font-bold text-foreground">
              PKR {doctor.fee.toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground ml-1">/consultation</span>
          </div>
        </div>

        {/* View Profile Button */}
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-2"
          onClick={(e) => {
            e.stopPropagation();
            if (onViewProfile) {
              onViewProfile();
            } else {
              router.push(`/doctor/${doctor.id}`);
            }
          }}
        >
          View Profile
          <ArrowRight className="h-3 w-3 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
