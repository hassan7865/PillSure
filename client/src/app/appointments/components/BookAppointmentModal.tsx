"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/shell/app-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Video, User as UserIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { Doctor } from "@/lib/types";
import { useCreateAppointment, useBookedSlots } from "../use-appointments";
import Loader from "@/components/ui/loader";
import { useCustomToast } from "@/hooks/use-custom-toast";

interface BookAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  doctor: Doctor;
}

interface AppointmentFormValues {
  appointmentDate: Date | undefined;
  appointmentTime: string;
  consultationMode: "inperson" | "online";
  patientNotes: string;
}

export default function BookAppointmentModal({ open, onClose, doctor }: BookAppointmentModalProps) {
  const createAppointmentMutation = useCreateAppointment();
  const { showError } = useCustomToast();

  const bookableAffiliations = useMemo(
    () => (Array.isArray(doctor.bookableAffiliations) ? doctor.bookableAffiliations : []),
    [doctor.bookableAffiliations],
  );

  const [selectedPracticeAffiliationId, setSelectedPracticeAffiliationId] = useState<string | null>(null);

  const activeAffiliation = useMemo(() => {
    if (bookableAffiliations.length === 0) {
      return null;
    }
    if (bookableAffiliations.length === 1) {
      return bookableAffiliations[0];
    }
    if (!selectedPracticeAffiliationId) {
      return null;
    }
    return bookableAffiliations.find((a) => a.id === selectedPracticeAffiliationId) ?? null;
  }, [bookableAffiliations, selectedPracticeAffiliationId]);

  const schedule = useMemo(() => {
    if (activeAffiliation) {
      const daysFromAff =
        activeAffiliation.availableDays?.length > 0
          ? activeAffiliation.availableDays
          : Array.isArray(doctor.availableDays)
            ? doctor.availableDays
            : [];
      return {
        availableDays: Array.isArray(daysFromAff) ? daysFromAff : [],
        openingTime: activeAffiliation.openingTime || doctor.openingTime || "09:00",
        closingTime: activeAffiliation.closingTime || doctor.closingTime || "18:00",
      };
    }
    return {
      availableDays: Array.isArray(doctor.availableDays) ? doctor.availableDays : [],
      openingTime: doctor.openingTime || "09:00",
      closingTime: doctor.closingTime || "18:00",
    };
  }, [activeAffiliation, doctor.availableDays, doctor.openingTime, doctor.closingTime]);

  const availableDays = schedule.availableDays;
  const openingTime = schedule.openingTime;
  const closingTime = schedule.closingTime;

  const displayFeePkr = useMemo(() => {
    if (activeAffiliation?.feePkr != null && activeAffiliation.feePkr !== "") {
      const n = parseFloat(activeAffiliation.feePkr);
      if (!Number.isNaN(n) && n > 0) {
        return n;
      }
    }
    return doctor.fee;
  }, [activeAffiliation, doctor.fee]);

  const consultationModes = Array.isArray((doctor as any).consultationModes) 
    ? (doctor as any).consultationModes 
    : ["inperson"];

  // Convert day names to numbers (0 = Sunday, 1 = Monday, etc.) - same as doctor profile
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
    (day: string) => dayNameToNumber[day.toLowerCase()] ?? -1
  ).filter((num: number) => num !== -1);

  const form = useForm<AppointmentFormValues>({
    defaultValues: {
      appointmentDate: undefined,
      appointmentTime: "",
      consultationMode: consultationModes.length > 0 
        ? (consultationModes.includes("inperson") ? "inperson" : consultationModes[0])
        : "inperson",
      patientNotes: "",
    },
    mode: "onChange",
  });

  const selectedDate = form.watch("appointmentDate");
  const selectedTime = form.watch("appointmentTime");

  const formattedDate = selectedDate ? selectedDate.toISOString().split('T')[0] : undefined;
  const { data: bookedSlots, isLoading: isLoadingSlots } = useBookedSlots(doctor.id, formattedDate);
  const bookedSlotsArray: string[] = bookedSlots || [];

  useEffect(() => {
    if (open) {
      if (bookableAffiliations.length === 1) {
        setSelectedPracticeAffiliationId(bookableAffiliations[0].id);
      } else {
        setSelectedPracticeAffiliationId(null);
      }
      form.reset({
        appointmentDate: undefined,
        appointmentTime: "",
        consultationMode: consultationModes.length > 0 
          ? (consultationModes.includes("inperson") ? "inperson" : consultationModes[0])
          : "inperson",
        patientNotes: "",
      });
    }
  }, [open, form, consultationModes, bookableAffiliations]);

  const isDayAvailable = (date: Date): boolean => {
    if (availableDayNumbers.length === 0) return true;
    const dayOfWeek = date.getDay();
    return availableDayNumbers.includes(dayOfWeek);
  };

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

  const availableSlots = useMemo(() => {
    let slots = generateTimeSlots(openingTime, closingTime);
    if (!selectedDate) {
      return slots;
    }
    const wd = selectedDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const hmList = activeAffiliation?.halfHourSlotsByWeekday?.[wd];
    if (hmList && hmList.length > 0) {
      const allow = new Set(hmList.map((h) => String(h).slice(0, 5)));
      slots = slots.filter((s) => allow.has(s));
    }
    return slots;
  }, [openingTime, closingTime, selectedDate, activeAffiliation]);

  const onSubmit = async (data: AppointmentFormValues) => {
    if (!data.appointmentDate) return;

    if (bookableAffiliations.length > 1 && !selectedPracticeAffiliationId) {
      showError("Choose a practice", "Select where you want to be seen before booking.");
      return;
    }

    let practiceAffiliationId: string | null | undefined;
    if (bookableAffiliations.length === 1) {
      practiceAffiliationId = bookableAffiliations[0].id;
    } else if (bookableAffiliations.length > 1) {
      practiceAffiliationId = selectedPracticeAffiliationId;
    } else {
      practiceAffiliationId = undefined;
    }

    const appointmentData = {
      doctorId: doctor.id,
      appointmentDate: data.appointmentDate.toISOString().split('T')[0],
      appointmentTime: data.appointmentTime,
      consultationMode: data.consultationMode,
      patientNotes: data.patientNotes.trim() || undefined,
      ...(practiceAffiliationId ? { practiceAffiliationId } : {}),
    };

    try {
      const checkoutUrl = await createAppointmentMutation.mutateAsync(appointmentData);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Booking error:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <AppDialogContent
        size="lg"
        className="max-w-[95vw] sm:max-w-xl md:max-w-2xl !max-h-[95vh] sm:!max-h-[90vh] flex flex-col gap-0 !overflow-hidden p-0"
      >
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold">Book Appointment</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Schedule your consultation with Dr. {doctor.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span className="text-sm sm:text-base font-semibold">{doctor.name}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{doctor.specialization}</div>
                  <div className="text-xs sm:text-sm font-semibold text-primary">PKR {displayFeePkr} per consultation</div>
                </div>

                <Separator />

                {bookableAffiliations.length > 1 ? (
                  <div className="space-y-2">
                    <Label htmlFor="practice-site" className="text-sm sm:text-base font-semibold">
                      Practice location
                    </Label>
                    <Select
                      value={selectedPracticeAffiliationId ?? ""}
                      onValueChange={(v) => setSelectedPracticeAffiliationId(v || null)}
                    >
                      <SelectTrigger id="practice-site" className="h-10 w-full" aria-label="Practice location">
                        <SelectValue placeholder="Select hospital, clinic, or private practice" />
                      </SelectTrigger>
                      <SelectContent>
                        {bookableAffiliations.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Hours and fee may differ by site. Choose where you will attend.
                    </p>
                  </div>
                ) : null}

                <div className="space-y-3 sm:space-y-4">
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    rules={{
                      required: "Please select an appointment date"
                    }}
                    render={({ field }) => (
                          <FormItem>
                        <Label className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 flex items-center gap-2">
                          <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                          Select Date
                        </Label>
                        {availableDays.length > 0 && (
                          <div className="mb-2 sm:mb-3 flex flex-wrap gap-1.5 sm:gap-2">
                            <span className="text-xs sm:text-sm text-muted-foreground">Available on:</span>
                            {availableDays.map((day: string) => (
                              <Badge key={day} variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                                {day}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <FormControl>
                          <div className="flex justify-center border rounded-lg p-2 sm:p-3">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                if (date < today) return true;
                                if (bookableAffiliations.length > 1 && !activeAffiliation) {
                                  return true;
                                }
                                if (availableDays.length > 0) {
                                  return !isDayAvailable(date);
                                }
                                return false;
                              }}
                              className="rounded-md scale-90 sm:scale-100"
                              modifiersClassNames={{
                                selected: "bg-primary text-primary-foreground",
                                disabled: "text-muted-foreground opacity-50",
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />

                  {selectedDate && (
                    <>
                      <Separator />
                      
                      {/* Consultation Mode - Show if both are available, allow selection */}
                      {consultationModes.length > 1 && (
                        <>
                          <FormField
                            control={form.control}
                            name="consultationMode"
                            rules={{
                              required: "Please select a consultation mode"
                            }}
                            render={({ field }) => (
                              <FormItem>
                                <Label className="text-sm sm:text-base font-semibold flex items-center gap-2">
                                  <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                  Consultation Mode
                                </Label>
                                <FormControl>
                                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                    {consultationModes.includes("inperson") && (
                                      <Button
                                        type="button"
                                        variant={field.value === "inperson" ? "default" : "outline"}
                                        onClick={() => field.onChange("inperson")}
                                        className="h-12 sm:h-14 flex flex-col gap-0.5 sm:gap-1"
                                      >
                                        <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="text-[10px] sm:text-xs">In-Person</span>
                                      </Button>
                                    )}
                                    {consultationModes.includes("online") && (
                                      <Button
                                        type="button"
                                        variant={field.value === "online" ? "default" : "outline"}
                                        onClick={() => field.onChange("online")}
                                        className="h-12 sm:h-14 flex flex-col gap-0.5 sm:gap-1"
                                      >
                                        <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="text-[10px] sm:text-xs">Online</span>
                                      </Button>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs sm:text-sm" />
                              </FormItem>
                            )}
                          />
                          <Separator />
                        </>
                      )}
                      
                      <FormField
                        control={form.control}
                        name="appointmentTime"
                        rules={{
                          required: "Please select a time slot"
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <Label className="text-sm sm:text-base font-semibold flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                              Select Time Slot
                            </Label>
                            {openingTime && closingTime && (
                              <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                                Available: {openingTime} - {closingTime}
                              </div>
                            )}
                                   <FormControl>
                                     <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                                       {isLoadingSlots ? (
                                         <div className="col-span-3 sm:col-span-4 py-8">
                                           <Loader
                                             title="Loading Time Slots"
                                             description="Fetching available appointment times..."
                                           />
                                         </div>
                                       ) : (
                                         availableSlots.map((slot) => {
                                           const isBooked = bookedSlotsArray.includes(slot);
                                           return (
                                             <Button
                                               key={slot}
                                               type="button"
                                               variant={field.value === slot ? "default" : "outline"}
                                               onClick={() => !isBooked && field.onChange(slot)}
                                               disabled={isBooked}
                                               className={`h-9 sm:h-10 text-xs sm:text-sm ${isBooked ? 'opacity-50 cursor-not-allowed line-through' : ''}`}
                                               title={isBooked ? "This slot is already booked" : ""}
                                             >
                                               {slot}
                                             </Button>
                                           );
                                         })
                                       )}
                                     </div>
                                   </FormControl>
                            {availableSlots.length === 0 && (
                              <div className="text-xs sm:text-sm text-muted-foreground p-3 sm:p-4 bg-muted/50 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                No available time slots
                              </div>
                            )}
                            <FormMessage className="text-xs sm:text-sm" />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {/* Show consultation mode if only one option is available (for display purposes) */}
                  {selectedTime && consultationModes.length === 1 && (
                    <>
                      <Separator />
                      
                      <FormField
                        control={form.control}
                        name="consultationMode"
                        rules={{
                          required: "Please select a consultation mode"
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <Label className="text-sm sm:text-base font-semibold flex items-center gap-2">
                              <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                              Consultation Mode
                            </Label>
                            <FormControl>
                              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                {consultationModes.includes("inperson") && (
                                  <Button
                                    type="button"
                                    variant={field.value === "inperson" ? "default" : "outline"}
                                    onClick={() => field.onChange("inperson")}
                                    className="h-12 sm:h-14 flex flex-col gap-0.5 sm:gap-1"
                                  >
                                    <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="text-[10px] sm:text-xs">In-Person</span>
                                  </Button>
                                )}
                                {consultationModes.includes("online") && (
                                  <Button
                                    type="button"
                                    variant={field.value === "online" ? "default" : "outline"}
                                    onClick={() => field.onChange("online")}
                                    className="h-12 sm:h-14 flex flex-col gap-0.5 sm:gap-1"
                                  >
                                    <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="text-[10px] sm:text-xs">Online</span>
                                  </Button>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs sm:text-sm" />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <FormField
                        control={form.control}
                        name="patientNotes"
                        rules={{
                          maxLength: {
                            value: 500,
                            message: "Notes cannot exceed 500 characters"
                          }
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <Label htmlFor="notes" className="text-sm sm:text-base font-semibold">
                              Patient Notes (Optional)
                            </Label>
                            <FormControl>
                              <Textarea
                                id="notes"
                                placeholder="Describe your symptoms or reason for consultation..."
                                {...field}
                                className="min-h-[80px] sm:min-h-[100px] resize-none text-xs sm:text-sm"
                                maxLength={500}
                              />
                            </FormControl>
                            <div className="text-[10px] sm:text-xs text-muted-foreground text-right">
                              {field.value.length}/500 characters
                            </div>
                            <FormMessage className="text-xs sm:text-sm" />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t p-4 sm:p-6 bg-muted/30 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={createAppointmentMutation.isLoading}
                  className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createAppointmentMutation.isLoading ||
                    (bookableAffiliations.length > 1 && !selectedPracticeAffiliationId)
                  }
                  className="flex-1 h-10 sm:h-11 text-xs sm:text-sm bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                >
                  {createAppointmentMutation.isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                      Continue to Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </AppDialogContent>
    </Dialog>
  );
}

