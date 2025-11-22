"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useDoctorAppointments } from "@/app/appointments/use-appointments";
import { doctorApi } from "@/app/search-doctor/_api";
import { Doctor } from "@/lib/types";
import Loader from "@/components/ui/loader";
import EmptyState from "@/components/ui/empty-state";
import { CalendarClock, User, Clock, Video, Phone, Stethoscope, FileText, AlertCircle } from "lucide-react";

export default function AppointmentsPage() {
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const doctorId = currentDoctor?.id;
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'prescription'>('details');

  // Fetch current doctor
  useEffect(() => {
    let isMounted = true;
    
    const fetchCurrentDoctor = async () => {
      try {
        setDoctorLoading(true);
        const result = await doctorApi.getCurrentDoctor();
        if (isMounted) {
          setCurrentDoctor(result);
        }
      } catch (err) {
        console.error('Failed to fetch current doctor:', err);
      } finally {
        if (isMounted) {
          setDoctorLoading(false);
        }
      }
    };

    fetchCurrentDoctor();

    return () => {
      isMounted = false;
    };
  }, []);

  // Only fetch appointments when doctorId is available
  const { data: appointments, isLoading: apptLoading } = useDoctorAppointments(doctorId || "", undefined);

  // Support both array and ApiResponse object
  const apptArray = Array.isArray(appointments)
    ? appointments
    : appointments?.data;

  // Auto-select the first appointment when data loads
  useEffect(() => {
    if (!selected && apptArray && apptArray.length > 0) {
      setSelected(apptArray[0]);
    }
  }, [apptArray, selected]);

  if (doctorLoading || !doctorId) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader 
          title="Loading Doctor Info"
          description="Fetching your profile information..."
        />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConsultationModeIcon = (mode: string) => {
    const modeLower = mode?.toLowerCase();
    switch (modeLower) {
      case 'online':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'in-person':
        return <User className="h-4 w-4" />;
      default:
        return <Stethoscope className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 lg:p-6 bg-background">
      {/* Left: Appointment List */}
      <Card className="w-full lg:w-[400px] lg:min-w-[360px] lg:max-w-md flex flex-col h-full lg:h-[calc(100vh-8rem)]">
        <CardHeader className="border-b">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Appointments
          </CardTitle>
          <CardDescription>
            {apptArray?.length || 0} appointment{apptArray?.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {apptLoading ? (
            <div className="flex items-center justify-center h-full py-8">
              <Loader 
                title="Loading Appointments"
                description="Fetching your appointments..."
              />
            </div>
          ) : !apptArray || apptArray.length === 0 ? (
            <EmptyState
              type="empty"
              title="No Appointments Found"
              description="Your appointments will appear here"
              icon={<CalendarClock className="w-12 h-12 text-muted-foreground" />}
            />
          ) : (
            <div className="flex flex-col gap-3 p-4">
              {apptArray.map((appt: any) => (
                <div
                  key={appt.id}
                  className={`transition-all duration-200 cursor-pointer rounded-lg border p-4 hover:shadow-md ${
                    selected?.id === appt.id 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                  onClick={() => setSelected(appt)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {appt.patientName || appt.patientId || 'Unknown Patient'}
                      </h3>
                    </div>
                    {getStatusBadge(appt.status)}
                  </div>
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{appt.appointmentDate} {appt.appointmentTime}</span>
                    </div>
                    {appt.consultationMode && (
                      <div className="flex items-center gap-2 text-sm">
                        {getConsultationModeIcon(appt.consultationMode)}
                        <Badge variant="outline" className="text-xs">
                          {appt.consultationMode}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right: Tabbed Details/Prescription */}
      <Card className="flex-1 flex flex-col h-full lg:h-[calc(100vh-8rem)]">
        {!selected ? (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center p-6">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No appointment selected</p>
              <p className="text-sm text-muted-foreground">Select an appointment from the list to view details</p>
            </div>
          </CardContent>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'prescription')} className="flex flex-col h-full">
            <CardHeader className="border-b">
              <TabsList className="w-fit">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Appointment Details
                </TabsTrigger>
                <TabsTrigger value="prescription" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Prescription
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
                <TabsContent value="details" className="space-y-6 mt-0">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Patient Information</h2>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    <DetailRow label="Patient Name" value={selected.patientName || selected.patientId || 'N/A'} />
                    <Separator />
                    <DetailRow label="Patient ID" value={selected.patientId || 'N/A'} />
                    <Separator />
                    <DetailRow label="Doctor ID" value={selected.doctorId || 'N/A'} />
                    <Separator />
                    <DetailRow label="Consultation Mode" value={selected.consultationMode || 'N/A'} />
                    <Separator />
                    <DetailRow label="Status" value={<>{getStatusBadge(selected.status)}</>} />
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Appointment Details</h2>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    <DetailRow label="Date" value={selected.appointmentDate || 'N/A'} />
                    <Separator />
                    <DetailRow label="Time" value={selected.appointmentTime || 'N/A'} />
                    <Separator />
                    <DetailRow label="Active" value={selected.isActive ? 'Yes' : 'No'} />
                  </div>
                </div>

                {(selected.patientNotes || selected.doctorNotes || selected.diagnosis || selected.cancellationReason) && (
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-4">Notes & Information</h2>
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                      {selected.patientNotes && (
                        <>
                          <DetailRow label="Patient Notes" value={selected.patientNotes} />
                          <Separator />
                        </>
                      )}
                      {selected.doctorNotes && (
                        <>
                          <DetailRow label="Doctor Notes" value={selected.doctorNotes} />
                          <Separator />
                        </>
                      )}
                      {selected.diagnosis && (
                        <>
                          <DetailRow label="Diagnosis" value={selected.diagnosis} />
                          <Separator />
                        </>
                      )}
                      {selected.cancellationReason && (
                        <DetailRow label="Cancellation Reason" value={selected.cancellationReason} />
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="prescription" className="space-y-6 mt-0">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Prescription
                  </h2>
                  {selected.prescription ? (
                    <div className="rounded-lg border bg-primary/5 p-6">
                      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                        {selected.prescription}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center rounded-lg border border-dashed">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground font-medium">No prescription available</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        This appointment does not have a prescription yet.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        )}
      </Card>
    </div>
  );
}

// Helper component for detail rows
interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <span className="font-medium text-muted-foreground min-w-[140px] text-sm">{label}:</span>
      <div className="flex-1 text-foreground text-sm break-words">
        {typeof value === 'string' ? (
          <span className={value === 'N/A' ? 'text-muted-foreground italic' : ''}>{value}</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
