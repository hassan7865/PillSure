"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Clock, Award, GraduationCap, Building2, Calendar, Zap } from "lucide-react";
import { Doctor } from "@/lib/types";

export default function DoctorCard({ doc }: { doc: Doctor }) {
  return (
    <Card className="group h-full bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Responsive Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-purple-500/5 to-blue-500/10 p-4 md:p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              {/* Doctor Image */}
              <div className="relative">
                <img
                  src={doc.image}
                  alt={doc.name}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl object-cover border-2 border-white shadow-md"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                  <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-white rounded-full"></div>
                </div>
              </div>

              {/* Rating Badge */}
              <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full shadow-sm">
                <Star className="w-3 h-3 md:w-4 md:h-4 fill-amber-400 text-amber-400" />
                <span className="text-xs md:text-sm font-semibold text-foreground">{doc.rating}</span>
              </div>
            </div>

            {/* Doctor Info */}
            <div className="space-y-2 md:space-y-3">
              <h3 className="text-base md:text-lg font-bold text-foreground leading-tight line-clamp-1">{doc.name}</h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Award className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm font-medium truncate">{doc.specialization}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm">{doc.experience} years experience</span>
              </div>
              {doc.hospital && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                  <span className="text-xs md:text-sm truncate">{doc.hospital.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Responsive Content Section */}
        <div className="p-4 md:p-6 flex-1 flex flex-col">
          <div className="space-y-3 md:space-y-4 flex-1">
            {/* Qualifications */}
            {doc.qualifications && doc.qualifications.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium text-foreground">Qualifications</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {doc.qualifications.slice(0, 2).map((qual, index) => (
                    <span key={index} className="px-1.5 md:px-2 py-0.5 md:py-1 bg-primary/10 text-primary text-xs rounded-md md:rounded-lg font-medium">
                      {qual}
                    </span>
                  ))}
                  {doc.qualifications.length > 2 && (
                    <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-muted text-muted-foreground text-xs rounded-md md:rounded-lg">
                      +{doc.qualifications.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Address */}
            {doc.address && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium text-foreground">Location</span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{doc.address}</p>
              </div>
            )}

            {/* Fee Information */}
            <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg md:rounded-xl p-3 md:p-4 border border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Consultation Fee</p>
                  <p className="text-lg md:text-xl font-bold text-primary">PKR {doc.fee}</p>
                  <p className="text-xs text-muted-foreground">Per consultation</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-500" />
                    <span className="text-xs font-medium text-green-600">Online</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" />
                    <span className="text-xs font-medium text-blue-600">In-Person</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Responsive Action Button */}
          <div className="mt-4 md:mt-6">
            <Button 
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white rounded-lg md:rounded-xl py-2.5 md:py-3 text-xs md:text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
            >
              Book Appointment
            </Button>
          </div>

          {/* Responsive Quick Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 md:mt-4 pt-2 md:pt-3 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span className="text-xs">Available Today</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span className="text-xs">30 min slots</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
