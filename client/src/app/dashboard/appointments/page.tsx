"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useDoctorAppointments } from "@/app/appointments/use-appointments";
import { useCurrentDoctor } from "@/hooks/use-doctor";

export default function AppointmentsPage() {
  const { data: currentDoctor, isLoading: doctorLoading } = useCurrentDoctor();
  const doctorId = currentDoctor?.id;
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'prescription'>('details');

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
    return <div className="flex items-center justify-center h-full w-full text-muted-foreground">Loading doctor info...</div>;
  }

  return (
    <div className="flex h-full gap-8 p-8 bg-background">
      {/* Left: Appointment List */}
  <Card className="w-[360px] min-w-[320px] max-w-md h-[700px] overflow-y-auto overflow-x-hidden rounded-3xl shadow-lg border border-border bg-neutral-50">
  <div className="p-8 font-extrabold text-2xl border-b bg-gradient-to-r from-[#f7f8fa] to-[#eaf2fb] text-[#174ea6] tracking-tight">Appointments</div>
        {apptLoading ? (
          <div className="p-8">Loading...</div>
        ) : !apptArray || apptArray.length === 0 ? (
          <div className="p-8 text-muted-foreground">No appointments found.</div>
        ) : (
          <ul className="flex flex-col gap-5 py-6">
            {apptArray.map((appt: any) => (
              <li
                key={appt.id}
                className={`transition-all duration-200 cursor-pointer rounded-2xl px-6 py-5 border flex flex-col gap-2 shadow-sm ${selected?.id === appt.id ? "border-blue-600 bg-blue-50" : "border-transparent bg-white hover:scale-[1.02] hover:shadow-md"}`}
                onClick={() => setSelected(appt)}
              >
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-lg text-blue-900 truncate">
                    {appt.patientName || appt.patientId}
                  </div>
                  <span className={`ml-auto px-2 py-0.5 rounded text-xs font-semibold capitalize ${appt.status === 'completed' ? 'bg-green-100 text-green-700' : appt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-700'}`}>{appt.status}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-blue-500">
                  <span>{appt.appointmentDate} {appt.appointmentTime}</span>
                  <span className={`px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium capitalize`}>{appt.consultationMode}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {/* Center: Tabbed Details/Prescription */}
      <Card className="flex-1 h-full rounded-3xl shadow-lg border border-border bg-white flex flex-col justify-start">
        {/* Tab Header */}
        <div className="flex border-b border-[#eaf2fb] bg-gradient-to-r from-[#f7f8fa] to-[#eaf2fb] rounded-t-3xl">
          <button
            className={`flex-1 py-4 text-lg font-bold transition-colors duration-150 rounded-tl-3xl focus:outline-none ${activeTab === 'details' ? 'bg-white text-[#174ea6] border-b-4 border-[#174ea6]' : 'text-gray-500 hover:text-[#174ea6]'}`}
            onClick={() => setActiveTab('details')}
          >
            Appointment Details
          </button>
          <button
            className={`flex-1 py-4 text-lg font-bold transition-colors duration-150 rounded-tr-3xl focus:outline-none ${activeTab === 'prescription' ? 'bg-white text-[#174ea6] border-b-4 border-[#174ea6]' : 'text-gray-500 hover:text-[#174ea6]'}`}
            onClick={() => setActiveTab('prescription')}
          >
            Prescription
          </button>
        </div>
        {/* Tab Content */}
        <div className="flex-1 p-10">
          {activeTab === 'details'
            ? (
                selected ? (
                  <div className="space-y-8">
                    <div className="rounded-xl bg-gradient-to-r from-[#f7f8fa] to-[#eaf2fb] p-6 mb-8">
                      <div className="text-lg font-bold text-[#174ea6] mb-2">Patient Details</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailRow label="Patient Name" value={selected.patientName || selected.patientId} color="#174ea6" />
                        <DetailRow label="Patient ID" value={selected.patientId} color="#174ea6" />
                        <DetailRow label="Doctor ID" value={selected.doctorId} color="#174ea6" />
                        <DetailRow label="Consultation Mode" value={selected.consultationMode} color="#174ea6" />
                        <DetailRow label="Status" value={selected.status} color="#174ea6" />
                        <DetailRow label="Active" value={selected.isActive ? 'Yes' : 'No'} color="#174ea6" />
                        <DetailRow label="Date" value={selected.appointmentDate} color="#174ea6" />
                        <DetailRow label="Time" value={selected.appointmentTime} color="#174ea6" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <DetailRow label="Patient Notes" value={selected.patientNotes} color="#174ea6" />
                        <DetailRow label="Doctor Notes" value={selected.doctorNotes} color="#174ea6" />
                        <DetailRow label="Diagnosis" value={selected.diagnosis} color="#174ea6" />
                        <DetailRow label="Cancellation Reason" value={selected.cancellationReason} color="#174ea6" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
                    Select an appointment to view details
                  </div>
                )
               ) : (
                <div className="space-y-8">
                  <div className="text-2xl font-bold mb-6 text-emerald-700 tracking-tight">Prescription</div>
                  {selected && selected.prescription ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-gray-800 shadow-sm">
                      {selected.prescription}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <span className="mb-2">No prescription available for this appointment.</span>
                      <span className="text-xs">Select an appointment with a prescription to view details here.</span>
                    </div>
                  )}
                </div>
              )}
        </div>
      </Card>
    </div>
  );
}

// Helper for details
interface DetailRowProps {
  label: string;
  value?: string;
  color?: string;
}
function DetailRow({ label, value, color }: DetailRowProps) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="font-semibold min-w-[140px]" style={color ? { color } : {}}>{label}:</span>
      <span className="text-gray-900 break-all">{value}</span>
    </div>
  )};
