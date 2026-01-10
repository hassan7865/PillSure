"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Doctor } from "@/lib/types";
import { useBookedSlots } from "@/app/appointments/use-appointments";
import Loader from "@/components/ui/loader";

interface AvailabilityCalendarProps {
  doctor: Doctor;
}

export default function AvailabilityCalendar({
  doctor,
}: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const availableDays = Array.isArray(doctor.availableDays)
    ? doctor.availableDays
    : [];

  const openingTime = doctor.openingTime || "09:00";
  const closingTime = doctor.closingTime || "18:00";

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

  // Format date for API
  const formattedDate = selectedDate ? selectedDate.toISOString().split('T')[0] : undefined;
  const { data: bookedSlots, isLoading: isLoadingSlots } = useBookedSlots(doctor.id, formattedDate);
  const bookedSlotsArray: string[] = bookedSlots || [];

  // Generate time slots
  const generateTimeSlots = (start: string, end: string): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin <= endMin)) {
      const timeSlot = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      slots.push(timeSlot);
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }
    
    return slots;
  };

  const availableSlots = generateTimeSlots(openingTime, closingTime);

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
        <div className="space-y-4">
          <div className="flex justify-center border rounded-lg p-2 sm:p-4 bg-muted/20">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
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

          {/* Time Slots View for Selected Date */}
          {selectedDate && isDayAvailable(selectedDate) && (
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-foreground">
                  Available Slots - {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {openingTime} - {closingTime}
                </Badge>
              </div>

              {isLoadingSlots ? (
                <div className="py-8">
                  <Loader
                    title="Loading Slots"
                    description="Fetching availability..."
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {availableSlots.map((slot) => {
                    const isBooked = bookedSlotsArray.includes(slot);
                    return (
                      <div
                        key={slot}
                        className={cn(
                          "p-2 rounded-lg text-center text-xs font-medium transition-all",
                          isBooked
                            ? "bg-destructive/10 text-destructive border border-destructive/20 line-through"
                            : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 cursor-pointer"
                        )}
                        title={isBooked ? "Booked" : "Available"}
                      >
                        {slot}
                      </div>
                    );
                  })}
                </div>
              )}

              {availableSlots.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No time slots available for this day
                </div>
              )}
            </div>
          )}

          {selectedDate && !isDayAvailable(selectedDate) && (
            <div className="border rounded-lg p-4 bg-muted/20 text-center">
              <p className="text-sm text-muted-foreground">
                Doctor is not available on this day
              </p>
            </div>
          )}

          {!selectedDate && (
            <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/20">
              Select a date to view available time slots
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary"></div>
            <span>Selected date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted opacity-50"></div>
            <span>Unavailable day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/10 border border-primary/20"></div>
            <span>Available slot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/10 border border-destructive/20 line-through"></div>
            <span>Booked slot</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

