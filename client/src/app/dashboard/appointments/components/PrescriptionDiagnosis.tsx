"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Stethoscope, X, Plus, Calendar, User, Building2 } from "lucide-react";
import SearchableMultiSelect from "@/components/ui/searchable-multi-select";
import { medicineApi, Medicine } from "@/app/medicine/_api";
import { useUpdateAppointmentNotes } from "@/app/appointments/use-appointments";

interface PrescriptionItem {
  medicineName: string;
  quantity: number;
  dose: string;
  medicineId?: number;
}

interface PrescriptionDiagnosisProps {
  appointment: any;
  allAppointments?: any[]; // For history tab
  onSave?: () => void;
}

export default function PrescriptionDiagnosis({
  appointment,
  allAppointments = [],
  onSave,
}: PrescriptionDiagnosisProps) {
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [diagnosisTags, setDiagnosisTags] = useState<string[]>([]);
  const [selectedMedicineIds, setSelectedMedicineIds] = useState<string[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<{ value: string; label: string }[]>([]);
  const [medicineMap, setMedicineMap] = useState<Map<number, Medicine>>(new Map());
  const [newQuantity, setNewQuantity] = useState<string>("1");
  const [newDose, setNewDose] = useState("");
  const [newDiagnosis, setNewDiagnosis] = useState("");
  const [medicineSearchQuery, setMedicineSearchQuery] = useState("");
  const [isSearchingMedicines, setIsSearchingMedicines] = useState(false);

  const { mutateAsync: updateNotes, isLoading: savingNotes } = useUpdateAppointmentNotes();

  // Sync structured fields when appointment changes
  useEffect(() => {
    if (!appointment) {
      setPrescriptionItems([]);
      setDiagnosisTags([]);
      return;
    }
    if (Array.isArray(appointment.prescription)) {
      setPrescriptionItems(appointment.prescription);
      // Pre-select medicines that are already in prescription
      const existingIds = appointment.prescription
        .filter((item: PrescriptionItem) => item.medicineId)
        .map((item: PrescriptionItem) => item.medicineId!.toString());
      setSelectedMedicineIds(existingIds);
    } else {
      setPrescriptionItems([]);
      setSelectedMedicineIds([]);
    }
    if (Array.isArray(appointment.diagnosis)) {
      setDiagnosisTags(appointment.diagnosis);
    } else if (typeof appointment.diagnosis === "string" && appointment.diagnosis.trim()) {
      setDiagnosisTags(appointment.diagnosis.split(",").map((d: string) => d.trim()).filter(Boolean));
    } else {
      setDiagnosisTags([]);
    }
  }, [appointment]);

  // Debounced medicine search for MultiSelect options
  useEffect(() => {
    if (!medicineSearchQuery.trim() || medicineSearchQuery.length < 2) {
      setMedicineOptions([]);
      setIsSearchingMedicines(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingMedicines(true);
      try {
        const results = await medicineApi.searchMedicines(medicineSearchQuery, 50);
        
        if (!Array.isArray(results) || results.length === 0) {
          setMedicineOptions([]);
          setMedicineMap(new Map());
          return;
        }
        
        const options = results.map((med) => ({
          value: med.id.toString(),
          label: `${med.medicineName}${med.drugCategory ? ` (${med.drugCategory})` : ""}`,
        }));
        
        const map = new Map<number, Medicine>();
        results.forEach((med) => map.set(med.id, med));
        setMedicineOptions(options);
        setMedicineMap(map);
      } catch (error) {
        setMedicineOptions([]);
        setMedicineMap(new Map());
      } finally {
        setIsSearchingMedicines(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [medicineSearchQuery]);

  // When a medicine is selected via Select, add it to prescription
  useEffect(() => {
    if (selectedMedicineIds.length === 0) return;
    
    const selectedId = selectedMedicineIds[0]; // Single select - take first item
    const medicine = medicineMap.get(parseInt(selectedId));
    if (!medicine) return;
    
    // Check if already in prescription
    const exists = prescriptionItems.some((item) => item.medicineId === medicine.id);
    if (exists) {
      // Clear selection if already exists
      setSelectedMedicineIds([]);
      return;
    }
    
    // Add to prescription
    const newMedicine: PrescriptionItem = {
      medicineName: medicine.medicineName,
      quantity: 1,
      dose: "",
      medicineId: medicine.id,
    };
    
    setPrescriptionItems((prev) => [...prev, newMedicine]);
    // Clear selection after adding
    setSelectedMedicineIds([]);
  }, [selectedMedicineIds, medicineMap, prescriptionItems]);

  const handleRemoveMedicine = (index: number) => {
    const item = prescriptionItems[index];
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
    if (item.medicineId) {
      setSelectedMedicineIds((prev) =>
        prev.filter((id) => id !== item.medicineId!.toString())
      );
    }
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setPrescriptionItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    );
  };

  const handleUpdateDose = (index: number, dose: string) => {
    setPrescriptionItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, dose } : item))
    );
  };

  const handleAddDiagnosis = () => {
    const value = newDiagnosis.trim();
    if (!value) return;
    setDiagnosisTags((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setNewDiagnosis("");
  };

  const handleRemoveDiagnosis = (idx: number) => {
    setDiagnosisTags((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveNotes = async () => {
    if (!appointment?.id) return;
    await updateNotes({
      id: appointment.id,
      data: {
        doctorNotes: appointment.doctorNotes ?? "",
        prescription: prescriptionItems,
        diagnosis: diagnosisTags,
      },
    });
    if (onSave) onSave();
  };

  // Filter completed appointments for history (same patient)
  const historyAppointments = allAppointments.filter(
    (apt) =>
      apt.patientId === appointment?.patientId &&
      apt.id !== appointment?.id &&
      apt.status?.toLowerCase() === "completed"
  );

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="prescription" className="flex flex-col h-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Prescription & Dosage
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescription" className="flex-1 overflow-y-auto space-y-4">
          {/* Medicines */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Medicines
            </h3>
            <div className="space-y-2">
              <SearchableMultiSelect
                options={medicineOptions}
                selected={selectedMedicineIds}
                onSelect={setSelectedMedicineIds}
                placeholder="Search medicines..."
                className="w-full"
                isLoading={isSearchingMedicines}
                onInputChange={(inputValue) => {
                  setMedicineSearchQuery(inputValue);
                }}
                existingMedicineIds={prescriptionItems
                  .filter((item) => item.medicineId)
                  .map((item) => item.medicineId!)}
              />
              {medicineSearchQuery.length > 0 && medicineSearchQuery.length < 2 && (
                <p className="text-xs text-muted-foreground px-1">
                  Type at least 2 characters to search
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {prescriptionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="w-full rounded-lg bg-primary/5 border border-primary/20 p-2 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs">{item.medicineName}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMedicine(idx)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      className="w-16 px-2 py-1 rounded border text-xs"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateQuantity(idx, Number(e.target.value) || 1)
                      }
                    />
                    <input
                      type="text"
                      placeholder="Dose e.g. 1x/day"
                      className="flex-1 px-2 py-1 rounded border text-xs"
                      value={item.dose}
                      onChange={(e) => handleUpdateDose(idx, e.target.value)}
                    />
                  </div>
                </div>
              ))}
              {prescriptionItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No medicines added yet. Search and select medicines above.
                </p>
              )}
            </div>
          </div>

          {/* Diagnosis */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Diagnosis
            </h3>
            <div className="flex flex-wrap gap-2">
              {diagnosisTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/5 border border-primary/20 px-3 py-1 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveDiagnosis(idx)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {diagnosisTags.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No diagnosis added yet.
                </p>
              )}
            </div>
            <input
              type="text"
              placeholder="Type disease and press Enter"
              className="w-full px-2 py-1 rounded border text-xs"
              value={newDiagnosis}
              onChange={(e) => setNewDiagnosis(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddDiagnosis();
                }
              }}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="gap-2"
              size="sm"
            >
              {savingNotes && (
                <span className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
              )}
              Save Prescription
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto space-y-3">
          {historyAppointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No previous completed appointments found for this patient.
              </p>
            </div>
          ) : (
            historyAppointments.map((apt) => (
              <div
                key={apt.id}
                className="rounded-lg border bg-muted/30 p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-semibold">
                        {apt.doctorName || "Unknown Doctor"}
                      </span>
                    </div>
                    {apt.hospitalName && (
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {apt.hospitalName}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
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
                      <h4 className="text-xs font-semibold mb-1">Prescription:</h4>
                      <div className="space-y-1">
                        {apt.prescription.map((item: PrescriptionItem, idx: number) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            • {item.medicineName} - Qty: {item.quantity}, Dose: {item.dose || "N/A"}
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
                      <h4 className="text-xs font-semibold mb-1">Diagnosis:</h4>
                      <div className="flex flex-wrap gap-1">
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
                      <h4 className="text-xs font-semibold mb-1">Notes:</h4>
                      <p className="text-xs text-muted-foreground">{apt.doctorNotes}</p>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

