"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentDoctorAppointments, useCompletedAppointmentsByPatientId } from "@/app/appointments/use-appointments";
import Loader from "@/components/ui/loader";
import EmptyState from "@/components/ui/empty-state";
import { CalendarClock, User, Clock, Video, Phone, Stethoscope, FileText, AlertCircle, Calendar, Building2 } from "lucide-react";
import LiveKitVideoCall from "@/components/livekit/LiveKitVideoCall";
import { useAuth } from "@/contexts/auth-context";
import { useUpdateAppointmentStatus } from "@/app/appointments/use-appointments";
import PrescriptionDiagnosis from "@/app/dashboard/appointments/components/PrescriptionDiagnosis";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'prescription'>('details');
  const [showVideoCall, setShowVideoCall] = useState(false);

  const { mutateAsync: updateStatus } = useUpdateAppointmentStatus();

  // Fetch appointments for current doctor
  const { data: appointments, isLoading: apptLoading } = useCurrentDoctorAppointments(undefined);

  // Support both array and ApiResponse object
  const apptArray = Array.isArray(appointments)
    ? appointments
    : appointments?.data;

  // Fetch completed appointments for the selected patient
  const { data: completedAppointments, isLoading: loadingCompleted } = useCompletedAppointmentsByPatientId(selected?.patientId);
  
  const completedAppointmentsArray = Array.isArray(completedAppointments)
    ? completedAppointments
    : completedAppointments?.data || [];

  // Auto-select the first appointment when data loads
  useEffect(() => {
    if (!selected && apptArray && apptArray.length > 0) {
      setSelected(apptArray[0]);
    }
  }, [apptArray, selected]);


  if (apptLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader 
          title="Loading Appointments"
          description="Fetching your appointments..."
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

  const handlePrescriptionSave = async () => {

    if (selected?.id && apptArray) {
      const updated = apptArray.find((apt: any) => apt.id === selected.id);
      if (updated) {
        setSelected(updated);
      }
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <TabsList className="w-full sm:w-fit">
                  <TabsTrigger value="details" className="flex items-center gap-2 flex-1 sm:flex-initial text-xs sm:text-sm">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Appointment </span>Details
                  </TabsTrigger>
                  <TabsTrigger value="prescription" className="flex items-center gap-2 flex-1 sm:flex-initial text-xs sm:text-sm">
                    <Stethoscope className="h-4 w-4 flex-shrink-0" />
                    Prescription
                  </TabsTrigger>
                </TabsList>
                {selected.status?.toLowerCase() !== 'completed' && (
                  <Button
                    onClick={async () => {
                      if (!selected?.id) return;
                      await updateStatus({
                        id: selected.id,
                        data: { status: "completed" },
                      });
                      setSelected((prev: any) =>
                        prev ? { ...prev, status: "completed" } : prev
                      );
                    }}
                    variant="default"
                    className="gap-2 w-full sm:w-auto text-xs sm:text-sm whitespace-nowrap"
                  >
                    <CalendarClock className="h-4 w-4" />
                    Mark Completed
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
                <TabsContent value="details" className="space-y-6 mt-0">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Patient Information</h2>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    <DetailRow label="Patient Name" value={selected.patientName || 'N/A'} />
                    <Separator />
                    <DetailRow label="Email" value={selected.patientEmail || 'N/A'} />
                    <Separator />
                    <DetailRow label="Gender" value={selected.patientGender || 'N/A'} />
                    <Separator />
                    <DetailRow label="Date of Birth" value={selected.patientDateOfBirth || 'N/A'} />
                    <Separator />
                    <DetailRow label="Mobile" value={selected.patientMobile || 'N/A'} />
                    <Separator />
                    <DetailRow label="Address" value={selected.patientAddress || 'N/A'} />
                    <Separator />
                    <DetailRow label="Blood Group" value={selected.patientBloodGroup || 'N/A'} />
                    <Separator />
                    <DetailRow label="COVID Status" value={selected.patientHasCovid ? 'Yes' : 'No'} />
                    {selected.patientPastMedicalHistory && (
                      <>
                        <Separator />
                        <DetailRow label="Past Medical History" value={selected.patientPastMedicalHistory} />
                      </>
                    )}
                    {selected.patientSurgicalHistory && (
                      <>
                        <Separator />
                        <DetailRow label="Surgical History" value={selected.patientSurgicalHistory} />
                      </>
                    )}
                    {selected.patientAllergies && (
                      <>
                        <Separator />
                        <DetailRow label="Allergies" value={selected.patientAllergies} />
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Appointment Overview</h2>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    <DetailRow label="Consultation Mode" value={selected.consultationMode || 'N/A'} />
                    <Separator />
                    <DetailRow label="Status" value={<>{getStatusBadge(selected.status)}</>} />
                    {selected.consultationMode?.toLowerCase() === 'online' && 
                     selected.meetingId && 
                     selected.status?.toLowerCase() !== 'completed' && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground text-sm">Video Consultation</span>
                          <Button
                            onClick={async () => {
                              if (!selected?.id) return;
                              const previousStatus = selected.status || 'confirmed';
                              if (selected.status?.toLowerCase() !== "in_progress") {
                                await updateStatus({
                                  id: selected.id,
                                  data: { status: "in_progress" },
                                });
                                setSelected((prev: any) =>
                                  prev ? { ...prev, status: "in_progress" } : prev
                                );
                              }
                              setShowVideoCall(true);
                            }}
                            className="gap-2"
                            variant="default"
                          >
                            <Video className="h-4 w-4" />
                            Join Video Call
                          </Button>
                        </div>
                      </>
                    )}
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

                {(selected.patientNotes || selected.doctorNotes || selected.cancellationReason) && (
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
                      {selected.cancellationReason && (
                        <DetailRow label="Cancellation Reason" value={selected.cancellationReason} />
                      )}
                    </div>
                  </div>
                )}

                {selected.status?.toLowerCase() === 'completed' && (
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-primary" />
                      Prescription & Diagnosis
                    </h2>
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                      {Array.isArray(selected.prescription) && selected.prescription.length > 0 && (
                        <>
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Prescription:</h3>
                            <div className="space-y-2">
                              {selected.prescription.map((item: any, idx: number) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{item.medicineName}</span>
                                  {item.quantity && (
                                    <span className="text-muted-foreground"> - Qty: {item.quantity}</span>
                                  )}
                                  {item.dose && (
                                    <span className="text-muted-foreground">, Dose: {item.dose}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}
                      {Array.isArray(selected.diagnosis) && selected.diagnosis.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Diagnosis:</h3>
                          <div className="flex flex-wrap gap-2">
                            {selected.diagnosis.map((diag: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {diag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {(!selected.prescription || (Array.isArray(selected.prescription) && selected.prescription.length === 0)) &&
                       (!selected.diagnosis || (Array.isArray(selected.diagnosis) && selected.diagnosis.length === 0)) && (
                        <p className="text-sm text-muted-foreground">No prescription or diagnosis recorded.</p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="prescription" className="space-y-6 mt-0">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    Previous Appointments
                  </h2>
                  {(() => {
                    // Use API data for completed appointments
                    if (!selected?.patientId) {
                      return (
                        <div className="text-center py-8 rounded-lg border bg-muted/30">
                          <p className="text-sm text-muted-foreground">
                            No appointment selected.
                          </p>
                        </div>
                      );
                    }

                    if (loadingCompleted) {
                      return (
                        <div className="text-center py-8 rounded-lg border bg-muted/30">
                          <Loader 
                            title="Loading History"
                            description="Fetching previous appointments..."
                          />
                        </div>
                      );
                    }

                    // Filter out current appointment from the results
                    const historyAppointments = (completedAppointmentsArray || []).filter(
                      (apt: any) => apt.id !== selected.id
                    );

                    if (historyAppointments.length === 0) {
                      return (
                        <div className="text-center py-8 rounded-lg border bg-muted/30">
                          <p className="text-sm text-muted-foreground">
                            No previous completed appointments found for this patient.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {historyAppointments.map((apt: any) => (
                          <div
                            key={apt.id}
                            className="rounded-lg border bg-muted/30 p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-semibold">
                                    {apt.doctorName || user?.firstName || "Unknown Doctor"}
                                  </span>
                                </div>
                                {apt.hospitalName && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      {apt.hospitalName}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {apt.appointmentDate} {apt.appointmentTime}
                                  </span>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {apt.status}
                              </Badge>
                            </div>

                            {Array.isArray(apt.prescription) && apt.prescription.length > 0 && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Prescription:</h4>
                                  <div className="space-y-2">
                                    {apt.prescription.map((item: any, idx: number) => (
                                      <div key={idx} className="text-sm text-foreground">
                                        <span className="font-medium">• {item.medicineName}</span>
                                        {item.quantity && (
                                          <span className="text-muted-foreground"> - Qty: {item.quantity}</span>
                                        )}
                                        {item.dose && (
                                          <span className="text-muted-foreground">, Dose: {item.dose}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}

                            {Array.isArray(apt.diagnosis) && apt.diagnosis.length > 0 && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Diagnosis:</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {apt.diagnosis.map((diag: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {diag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}

                            {apt.doctorNotes && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Notes:</h4>
                                  <p className="text-sm text-muted-foreground">{apt.doctorNotes}</p>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        )}
      </Card>

      <Dialog 
        open={showVideoCall} 
        onOpenChange={(open) => {
          setShowVideoCall(open);
        }}
      >
        <DialogContent 
          className="w-screen h-screen max-w-[100vw] sm:max-w-[100vw] max-h-none p-0 gap-0 overflow-hidden rounded-none" 
          showCloseButton={true}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Video Consultation</DialogTitle>
          </DialogHeader>
          {selected && selected.meetingId && (
            <div className="flex flex-col lg:flex-row w-full h-full">
              <div className="w-full lg:basis-[60%] lg:flex-1 h-[45vh] lg:h-full bg-black min-w-0">
                <LiveKitVideoCall
                  roomName={selected.meetingId}
                  displayName={user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.email || 'User'}
                  isModerator={true}
                  onClose={() => {
                    setShowVideoCall(false);
                  }}
                />
              </div>

              {/* Right: Prescription & Diagnosis side panel (about 40%, with max width) */}
              <div className="w-full lg:basis-[40%] lg:max-w-[420px] border-t lg:border-t-0 lg:border-l bg-background overflow-hidden p-4">
                <PrescriptionDiagnosis
                  appointment={selected}
                  allAppointments={apptArray || []}
                  onSave={handlePrescriptionSave}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
