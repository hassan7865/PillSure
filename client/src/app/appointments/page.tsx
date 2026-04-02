"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePatientAppointments } from "@/app/appointments/use-appointments";
import Loader from "@/components/ui/loader";
import EmptyState from "@/components/ui/empty-state";
import { CalendarClock, Clock, Video, Stethoscope, FileText, AlertCircle, History } from "lucide-react";
import LiveKitVideoCall from "@/components/livekit/LiveKitVideoCall";
import { useAuth } from "@/contexts/auth-context";
import PublicLayout from "@/layout/PublicLayout";
import { getStatusBadge, getConsultationModeIcon } from "@/lib/component-utils";
import { useCustomToast } from "@/hooks/use-custom-toast";
import cartApi from "@/app/cart/_api";

export default function PatientAppointmentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useCustomToast();
  const handledPaymentToastKeysRef = useRef<Set<string>>(new Set());
  const { user, token } = useAuth();
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'prescription'>('details');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [prescription, setPrescription] = useState<any>(null);
  const [showOrderPrescriptionDialog, setShowOrderPrescriptionDialog] = useState(false);
  const [selectedPrescriptionItems, setSelectedPrescriptionItems] = useState<Record<number, boolean>>({});
  const [orderingPrescription, setOrderingPrescription] = useState(false);
  const [listScope, setListScope] = useState<"active" | "history">("active");

  useEffect(() => {
    const paymentState = searchParams.get("payment");
    const sessionId = searchParams.get("session_id") || "";

    if (!paymentState) return;

    const toastKey = `${paymentState}:${sessionId}`;
    if (handledPaymentToastKeysRef.current.has(toastKey)) {
      return;
    }
    handledPaymentToastKeysRef.current.add(toastKey);

    if (paymentState === "success") {
      showSuccess("Booking successful", "Your appointment is confirmed.");
    }
    if (paymentState === "cancelled") {
      showError("Payment cancelled", "Your appointment was not booked.");
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("payment");
    nextParams.delete("session_id");
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [searchParams, showSuccess, showError, pathname, router]);

  // Fetch patient appointments
  const { data: appointments, isLoading: apptLoading } = usePatientAppointments(undefined);

  // Support both array and ApiResponse object
  const apptArray = Array.isArray(appointments)
    ? appointments
    : appointments?.data;

  useEffect(() => {
    if (apptArray) {
      setAppointmentsList(apptArray);
    }
  }, [apptArray]);

  const { activeCount, historyCount, filteredAppointments } = useMemo(() => {
    let active = 0;
    let history = 0;
    for (const a of appointmentsList) {
      if (appointmentIsCompleted(a?.status)) history += 1;
      else active += 1;
    }
    const filtered = appointmentsList.filter((a) =>
      listScope === "history" ? appointmentIsCompleted(a?.status) : !appointmentIsCompleted(a?.status)
    );
    return { activeCount: active, historyCount: history, filteredAppointments: filtered };
  }, [appointmentsList, listScope]);

  useEffect(() => {
    setSelected((prev: any) => {
      if (filteredAppointments.length === 0) return null;
      if (prev?.id) {
        const next = filteredAppointments.find((x: any) => x.id === prev.id);
        if (next) return next;
      }
      return filteredAppointments[0];
    });
  }, [filteredAppointments]);

  useEffect(() => {
    if (!token || !user) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(`${apiUrl}/api/appointments/patient/status/stream?token=${encodeURIComponent(token)}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          setAppointmentsList((prevList) => {
            const updatedList = prevList.map((apt: any) => 
              apt.id === data.appointmentId 
                ? { ...apt, status: data.status, meetingId: data.meetingId || apt.meetingId, consultationMode: data.consultationMode || apt.consultationMode }
                : apt
            );
            return updatedList;
          });

          setSelected((prevSelected: any) => {
            if (prevSelected?.id === data.appointmentId) {
              return { ...prevSelected, status: data.status, meetingId: data.meetingId || prevSelected.meetingId, consultationMode: data.consultationMode || prevSelected.consultationMode };
            }
            return prevSelected;
          });
        } catch (error) {
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(() => {
          connectSSE();
        }, 3000);
      };

      eventSource.onopen = () => {
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [token, user]);

  useEffect(() => {
    if (activeTab === 'prescription' && selected?.id) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return;
      fetch(`${apiUrl}/api/appointments/${selected.id}/prescription`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setPrescription(Array.isArray(data.data) ? data.data : []);
        })
        .catch(() => setPrescription([]));
    }
  }, [activeTab, selected?.id, token]);

  const handleOpenPrescriptionOrder = () => {
    const initial: Record<number, boolean> = {};
    (prescription || []).forEach((item: any, idx: number) => {
      initial[idx] = true;
    });
    setSelectedPrescriptionItems(initial);
    setShowOrderPrescriptionDialog(true);
  };

  const handleAddPrescriptionToCart = async () => {
    if (!selected?.id || !Array.isArray(prescription)) return;
    const chosen = prescription.filter((_: any, idx: number) => selectedPrescriptionItems[idx]);
    if (!chosen.length) {
      showError("No medicine selected", "Please select at least one prescribed medicine.");
      return;
    }

    try {
      setOrderingPrescription(true);
      for (const item of chosen) {
        if (!item?.medicineId) continue;
        await cartApi.addItem({
          medicineId: Number(item.medicineId),
          quantity: Number(item.quantity) || 1,
          sourceType: "prescription",
          appointmentId: selected.id,
        });
      }
      showSuccess("Added to cart", "Selected prescribed medicines were added to your cart.");
      setShowOrderPrescriptionDialog(false);
    } catch (error: any) {
      showError("Failed to add prescribed medicines", error?.response?.data?.error || "Please try again.");
    } finally {
      setOrderingPrescription(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl h-full flex flex-col">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">My Appointments</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and manage your appointments with doctors
          </p>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 gap-4 lg:gap-6 min-h-0">
          {/* Left: Appointment List */}
          <Card className="w-full lg:w-[360px] xl:w-[400px] lg:min-w-[320px] xl:min-w-[360px] lg:max-w-md flex flex-col h-full">
            <CardHeader className="border-b space-y-3">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Appointments
              </CardTitle>
              <Tabs
                value={listScope}
                onValueChange={(v) => setListScope(v as "active" | "history")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-auto gap-1 p-1">
                  <TabsTrigger value="active" className="gap-1.5 py-2.5 text-xs sm:text-sm">
                    <span className="truncate">Active</span>
                    {activeCount > 0 ? (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] sm:text-xs">
                        {activeCount}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-1.5 py-2.5 text-xs sm:text-sm">
                    <History className="h-3.5 w-3.5 shrink-0 hidden sm:inline" />
                    <span className="truncate">History</span>
                    {historyCount > 0 ? (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] sm:text-xs">
                        {historyCount}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <CardDescription className="space-y-1">
                <span>
                  {appointmentsList?.length || 0} total
                  {appointmentsList?.length !== 1 ? " appointments" : " appointment"}
                </span>
                <span className="block text-xs">
                  {listScope === "active"
                    ? "Everything except completed visits — pending, confirmed, in progress, cancelled, and more."
                    : "Completed consultations only."}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 min-h-[320px] sm:min-h-[400px] max-h-[70vh] lg:max-h-[600px]">
              {apptLoading ? (
                <div className="flex items-center justify-center h-full py-8">
                  <Loader 
                    title="Loading Appointments"
                    description="Fetching your appointments..."
                  />
                </div>
              ) : !appointmentsList || appointmentsList.length === 0 ? (
                <EmptyState
                  type="empty"
                  title="No Appointments Found"
                  description="Your appointments will appear here"
                  icon={<CalendarClock className="w-12 h-12 text-muted-foreground" />}
                />
              ) : filteredAppointments.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    type="empty"
                    title={listScope === "active" ? "Nothing in Active" : "No history yet"}
                    description={
                      listScope === "active"
                        ? "You have no upcoming or in-progress appointments. Check History for past visits."
                        : "Completed appointments will appear here."
                    }
                    icon={<CalendarClock className="w-12 h-12 text-muted-foreground" />}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  {filteredAppointments.map((appt: any) => (
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
                            {appt.doctorName || 'Unknown Doctor'}
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
          <Card className="flex-1 flex flex-col h-full">
            {!selected ? (
              <CardContent className="flex-1 flex items-center justify-center min-h-[320px] sm:min-h-[400px]">
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">No appointment selected</p>
                  <p className="text-sm text-muted-foreground">Select an appointment from the list to view details</p>
                </div>
              </CardContent>
            ) : (
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'prescription')} className="flex flex-col h-full">
                <CardHeader className="border-b">
                  <TabsList className="w-full sm:w-fit">
                    <TabsTrigger value="details" className="flex items-center gap-2 flex-1 sm:flex-initial text-xs sm:text-sm">
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Appointment </span>Details
                    </TabsTrigger>
                    <TabsTrigger value="prescription" className="flex items-center gap-2 flex-1 sm:flex-initial text-xs sm:text-sm">
                      <Stethoscope className="h-4 w-4" />
                      Prescription
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                    <TabsContent value="details" className="space-y-6 mt-0">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-4">Doctor Information</h2>
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                        <DetailRow label="Doctor Name" value={selected.doctorName || 'N/A'} />
                        <Separator />
                        <DetailRow label="Mobile" value={selected.doctorMobile || 'N/A'} />
                        <Separator />
                        <DetailRow label="Consultation Fee" value={selected.doctorFee ? `PKR ${selected.doctorFee}` : 'N/A'} />
                      </div>
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-4">Appointment Overview</h2>
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                        <DetailRow label="Consultation Mode" value={selected.consultationMode || 'N/A'} />
                        <Separator />
                    <DetailRow label="Status" value={<>{getStatusBadge(selected.status)}</>} />
                    {selected.consultationMode?.toLowerCase() === 'online' && selected.meetingId && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground text-sm">
                            Video Consultation
                          </span>
                          {selected.status?.toLowerCase() === 'in_progress' ? (
                            <Button
                              onClick={() => setShowVideoCall(true)}
                              className="gap-2"
                              variant="default"
                            >
                              <Video className="h-4 w-4" />
                              Join Video Call
                            </Button>
                          ) : (
                            <Button
                              disabled
                              className="gap-2"
                              variant="outline"
                            >
                              <Video className="h-4 w-4" />
                              Waiting for doctor to start
                            </Button>
                          )}
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
                        <DetailRow label="Created At" value={selected.createdAt ? new Date(selected.createdAt).toLocaleString() : 'N/A'} />
                      </div>
                    </div>

                    {(selected.patientNotes || selected.doctorNotes || selected.diagnosis || selected.cancellationReason) && (
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-4">Notes & Information</h2>
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                          {selected.patientNotes && (
                            <>
                              <DetailRow label="Your Notes" value={selected.patientNotes} />
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
                      {/* Only show prescription for current appointment. */}
                      {prescription && prescription.length > 0 ? (
                        <div className="rounded-lg border bg-primary/5 p-6 space-y-4">
                          <ul className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                            {prescription.map((item: any, idx: number) => (
                              <li key={idx}>
                                <strong>{item.medicineName}</strong> - {item.dose} ({item.quantity})
                              </li>
                            ))}
                          </ul>
                          {selected?.hasMedicineOrder ? (
                            <div className="rounded-lg border bg-background p-3">
                              <p className="text-sm font-medium text-foreground">Already ordered</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                This prescription has already been ordered.
                                {selected?.medicineOrderId ? ` Order ref: #${String(selected.medicineOrderId).slice(0, 8)}` : ""}
                              </p>
                            </div>
                          ) : (
                            <Button onClick={handleOpenPrescriptionOrder}>Order Medicines</Button>
                          )}
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

        {/* Video Call Dialog */}
        <Dialog 
          open={showVideoCall} 
          onOpenChange={(open) => {
            setShowVideoCall(open);
          }}
        >
          <DialogContent 
            className="w-screen h-screen max-w-[100vw] sm:max-w-[100vw] max-h-none p-0 gap-0 overflow-hidden rounded-none" 
            showCloseButton={false}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Video Consultation</DialogTitle>
            </DialogHeader>
            {selected && selected.meetingId && (
              <LiveKitVideoCall
                roomName={selected.meetingId}
                displayName={user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.email || 'User'}
                onClose={() => {
                  setShowVideoCall(false);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showOrderPrescriptionDialog} onOpenChange={setShowOrderPrescriptionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Medicines To Add To Cart</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {(prescription || []).map((item: any, idx: number) => (
                <label key={idx} className="flex items-center justify-between border rounded px-3 py-2">
                  <div>
                    <p className="font-medium">{item.medicineName}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity} {item.dose ? `| Dose: ${item.dose}` : ""}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!selectedPrescriptionItems[idx]}
                    onChange={(e) =>
                      setSelectedPrescriptionItems((prev) => ({ ...prev, [idx]: e.target.checked }))
                    }
                  />
                </label>
              ))}
              <Button disabled={orderingPrescription} onClick={handleAddPrescriptionToCart} className="w-full">
                {orderingPrescription ? "Adding..." : "Add Selected To Cart"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PublicLayout>
  );
}

/** Completed consultations only; all other statuses (incl. cancelled) stay under Active. */
function appointmentIsCompleted(status: unknown): boolean {
  return String(status ?? "").toLowerCase().trim() === "completed";
}

// Helper component for detail rows
interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <span className="font-medium text-muted-foreground sm:min-w-[140px] text-sm">{label}:</span>
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

