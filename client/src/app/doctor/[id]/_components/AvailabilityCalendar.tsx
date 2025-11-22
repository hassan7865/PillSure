"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Doctor } from "@/lib/types";

interface AvailabilityCalendarProps {
  doctor: Doctor;
}

export default function AvailabilityCalendar({
  doctor,
}: AvailabilityCalendarProps) {
  const availableDays = Array.isArray(doctor.availableDays)
    ? doctor.availableDays
    : [];

  // Convert day names to numbers (0 = Sunday, 1 = Monday, etc.)
  const dayNameToNumber: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const availableDayNumbers = availableDays.map(
    (day) => dayNameToNumber[day.toLowerCase()] ?? -1
  );

  const isDayAvailable = (date: Date): boolean => {
    if (availableDayNumbers.length === 0) return true;
    const dayOfWeek = date.getDay();
    return availableDayNumbers.includes(dayOfWeek);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Availability Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Available Days Badges */}
        {availableDays.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Available Days
            </p>
            <div className="flex flex-wrap gap-2">
              {availableDays.map((day, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs sm:text-sm px-2 py-1"
                >
                  {day}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Timing Information */}
        {(doctor.openingTime || doctor.closingTime) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Clock className="h-4 w-4 text-primary flex-shrink-0" />
            <span>
              {doctor.openingTime} - {doctor.closingTime}
            </span>
          </div>
        )}

        {/* Calendar */}
        <div className="flex justify-center border rounded-lg p-2 sm:p-4 bg-muted/20">
          <Calendar
            mode="single"
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (date < today) return true;
              if (availableDays.length > 0) {
                return !isDayAvailable(date);
              }
              return false;
            }}
            className="rounded-md"
            modifiersClassNames={{
              selected: "bg-primary text-primary-foreground",
              disabled: "text-muted-foreground opacity-50",
            }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary"></div>
            <span>Selected date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted opacity-50"></div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border"></div>
            <span>Available</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

