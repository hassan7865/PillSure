"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Clock, Award } from "lucide-react";
import { Doctor } from "@/lib/types";

export default function DoctorCard({ doc }: { doc: Doctor }) {
  return (
    <Card className="group hover:shadow-purple transition-all duration-300 border-0 bg-card rounded-3xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            {/* Doctor Image */}
            <div className="relative">
              <img
                src={doc.image}
                alt={doc.name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-background shadow-lg"
              />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>

            {/* Rating Badge */}
            <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-primary">{doc.rating}</span>
            </div>
          </div>

          {/* Doctor Info */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">{doc.name}</h3>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Award className="w-4 h-4" />
              <span className="text-sm font-medium">{doc.specialization}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{doc.experience} years experience</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 pt-4 space-y-4">
          {/* Fee Information */}
          <div className="bg-muted/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Consultation Fee</p>
                <p className="text-2xl font-bold text-primary">PKR {doc.fee}</p>
                <p className="text-xs text-muted-foreground">Per consultation</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Available</p>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-3">
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-3 font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
            >
              Book Appointment
            </Button>
          </div>

          {/* Quick Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>Available Today</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>30 min slots</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
