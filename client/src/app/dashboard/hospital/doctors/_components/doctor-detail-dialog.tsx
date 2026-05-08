"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Clock3,
  User,
  Wallet,
  XCircle,
} from "lucide-react";

import { useHospitalDoctorAppointments } from "@/app/appointments/use-appointments";
import { appointmentApi } from "@/app/appointments/components/_api";
import type {
  HospitalDoctorAppointmentRow,
  HospitalDoctorOfferRow,
  HospitalDoctorOfferService,
  OfferSlot,
  HospitalDoctorRow,
} from "@/app/appointments/components/_types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/shell/app-dialog";
import Loader from "@/components/ui/loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { surfaceInsetClass } from "@/lib/dashboard-ui";
import { getErrorMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";
import { useCustomToast } from "@/hooks/use-custom-toast";

function dateKey(raw: unknown): string {
  if (raw == null) return "";
  if (raw instanceof Date) {
    return format(raw, "yyyy-MM-dd");
  }
  if (typeof raw === "string") {
    return raw.slice(0, 10);
  }
  return String(raw).slice(0, 10);
}

function groupByDate(appointments: HospitalDoctorAppointmentRow[]): [string, HospitalDoctorAppointmentRow[]][] {
  const map = new Map<string, HospitalDoctorAppointmentRow[]>();
  for (const a of appointments) {
    const key = dateKey(a.appointmentDate);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(a);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((x, y) => String(x.appointmentTime).localeCompare(String(y.appointmentTime)));
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function formatDisplayDate(isoDay: string): string {
  try {
    return format(parseISO(`${isoDay}T12:00:00`), "EEEE, MMMM d, yyyy");
  } catch {
    return isoDay;
  }
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "default";
  if (s === "cancelled") return "destructive";
  if (s === "pending" || s === "in_progress") return "secondary";
  return "outline";
}

function normalizeStatus(s: string | undefined): string {
  return (s || "").toLowerCase().replace(/\s+/g, "_");
}

function initials(first?: string, last?: string): string {
  const a = (first || "").trim().charAt(0);
  const b = (last || "").trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DURATION_OPTIONS = [15, 30, 45, 60] as const;

type StatTileProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: "default" | "amber" | "emerald" | "rose" | "violet";
};

const accentIconBox: Record<StatTileProps["accent"], string> = {
  default: "bg-primary/15 text-primary",
  amber: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  emerald: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  rose: "bg-rose-500/15 text-rose-800 dark:text-rose-300",
  violet: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
};
function StatTile({ label, value, icon, accent }: StatTileProps) {
  return (
    <div
      className={cn(
        "relative min-h-[120px] min-w-[140px] overflow-visible rounded-2xl border border-border/80 bg-card p-5 shadow-sm",
        "transition-colors hover:border-primary/35",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl [&_svg]:h-[1.125rem] [&_svg]:w-[1.125rem]",
          accentIconBox[accent],
        )}
        aria-hidden
      >
        {icon}
      </div>
      <p className="mb-4 max-w-[calc(100%-3rem)] text-base font-medium leading-7 text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold leading-none tabular-nums tracking-tight text-foreground">{value}</p>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string | null;
  doctorSummary: HospitalDoctorRow | undefined;
};

export function HospitalDoctorDetailDialog({ open, onOpenChange, doctorId, doctorSummary }: Props) {
  const { showError, showSuccess } = useCustomToast();
  const [statusTab, setStatusTab] = useState<string>("all");
  const { data, isLoading, error } = useHospitalDoctorAppointments(doctorId ?? undefined);
  const [offers, setOffers] = useState<HospitalDoctorOfferRow[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersSubmitting, setOffersSubmitting] = useState(false);
  const [catalogServices, setCatalogServices] = useState<
    Array<{ id: string; serviceName: string; description: string | null; rate: string; currency: "PKR"; isActive: boolean }>
  >([]);
  const [selectedCatalogServiceIds, setSelectedCatalogServiceIds] = useState<string[]>([]);
  const [offeredSlots, setOfferedSlots] = useState<OfferSlot[]>([]);
  const [slotDraft, setSlotDraft] = useState<OfferSlot>({
    day: "monday",
    startTime: "",
    endTime: "",
    isAvailable: true,
    catalogServiceIds: [],
  });

  useEffect(() => {
    if (open && doctorId) {
      setStatusTab("all");
    }
  }, [open, doctorId]);

  useEffect(() => {
    const loadOffers = async () => {
      if (!open || !doctorId) return;
      setOffersLoading(true);
      try {
        const [rows, services] = await Promise.all([
          appointmentApi.getHospitalDoctorOffers(doctorId),
          appointmentApi.listHospitalServices(),
        ]);
        setOffers(rows);
        setCatalogServices(services.filter((s) => s.isActive));
      } catch (e) {
        showError("Could not load offers", getErrorMessage(e));
      } finally {
        setOffersLoading(false);
      }
    };
    void loadOffers();
  }, [doctorId, open, showError]);

  const handleAddSlotDraft = () => {
    if (!slotDraft.day || !slotDraft.startTime || !slotDraft.endTime) {
      showError("Missing slot fields", "Day, start time, and end time are required.");
      return;
    }
    const slotServiceIds = slotDraft.catalogServiceIds.length
      ? slotDraft.catalogServiceIds
      : selectedCatalogServiceIds;
    if (!slotServiceIds.length) {
      showError("Missing services", "Assign at least one service to the slot.");
      return;
    }
    setOfferedSlots((prev) => [...prev, { ...slotDraft, catalogServiceIds: slotServiceIds }]);
    setSlotDraft({ day: "monday", startTime: "", endTime: "", isAvailable: true, catalogServiceIds: [] });
  };

  const handleRemoveSlotDraft = (index: number) => {
    setOfferedSlots((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveOffer = async () => {
    if (!doctorId) return;
    const practiceAffiliationId = doctorSummary?.hospitalAffiliationId || "";
    if (!practiceAffiliationId) {
      showError("Affiliation missing", "Hospital affiliation is required before sending offers.");
      return;
    }
    if (!selectedCatalogServiceIds.length) {
      showError("Missing services", "Select at least one service from catalog.");
      return;
    }
    if (!offeredSlots.length) {
      showError("Missing slots", "Add at least one slot.");
      return;
    }
    if (doctorSummary?.hospitalAffiliationStatus !== "active") {
      showError(
        "Affiliation not accepted",
        "Doctor must accept the invitation first. Offers are allowed only for active affiliations.",
      );
      return;
    }
    setOffersSubmitting(true);
    try {
      const offeredServices = catalogServices
        .filter((s) => selectedCatalogServiceIds.includes(s.id))
        .map((s) => ({
          catalogServiceId: s.id,
          serviceName: s.serviceName,
          description: s.description || "",
          durationMinutes: 30,
        }));
      const payload: HospitalDoctorOfferService = {
        offeredServices,
        offeredSlots: offeredSlots.map((slot) => ({
          ...slot,
          catalogServiceIds: slot.catalogServiceIds.filter((id) => selectedCatalogServiceIds.includes(id)),
        })),
      };
      const saved = await appointmentApi.upsertHospitalDoctorOffer(doctorId, {
        practiceAffiliationId,
        offer: payload,
      });
      setOffers([saved]);
      setSelectedCatalogServiceIds([]);
      setOfferedSlots([]);
      showSuccess("Offer sent", "Doctor can review this schedule offer now.");
    } catch (e) {
      showError("Could not save offer", getErrorMessage(e));
    } finally {
      setOffersSubmitting(false);
    }
  };

  const appointments = data?.appointments ?? [];

  const filteredAppointments = useMemo(() => {
    if (statusTab === "all") return appointments;
    return appointments.filter((a) => normalizeStatus(a.status) === statusTab);
  }, [appointments, statusTab]);

  const grouped = useMemo(() => {
    if (!filteredAppointments.length) return [];
    return groupByDate(filteredAppointments);
  }, [filteredAppointments]);

  const statsCards = useMemo(() => {
    if (doctorSummary) {
      const bs = doctorSummary.byStatus || {};
      const pending = Number(bs.pending ?? 0) + Number(bs.in_progress ?? 0);
      return {
        total: doctorSummary.totalAppointments,
        pending,
        completed: Number(bs.completed ?? 0),
        cancelled: Number(bs.cancelled ?? 0),
        earned: Number(doctorSummary.totalEarned ?? 0),
        hasEarned: true,
      };
    }
    const by: Record<string, number> = {};
    for (const a of appointments) {
      const k = normalizeStatus(a.status);
      by[k] = (by[k] || 0) + 1;
    }
    const pending = Number(by.pending ?? 0) + Number(by.in_progress ?? 0);
    return {
      total: appointments.length,
      pending,
      completed: Number(by.completed ?? 0),
      cancelled: Number(by.cancelled ?? 0),
      earned: 0,
      hasEarned: false,
    };
  }, [doctorSummary, appointments]);

  const doctor = data?.doctor;
  const title = doctor
    ? `${doctor.firstName} ${doctor.lastName}`.trim()
    : doctorSummary
      ? `${doctorSummary.firstName} ${doctorSummary.lastName}`.trim()
      : "Doctor";

  const fn = doctor?.firstName ?? doctorSummary?.firstName;
  const ln = doctor?.lastName ?? doctorSummary?.lastName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        showCloseButton
        size="full"
        className={cn(
          "!overflow-hidden",
          "flex min-h-0 flex-col gap-0 rounded-2xl border-border/80 bg-background p-0 shadow-2xl",
          "w-[min(96vw,80rem)] !max-w-[min(96vw,80rem)] !max-h-[min(96vh,1080px)]",
        )}
      >
        <div className="relative shrink-0 overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/[0.07] via-background to-muted/20 px-6 py-8 sm:px-10 sm:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/75 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/25"
              aria-hidden
            >
              {initials(fn, ln)}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <DialogHeader className="space-y-1.5 p-0 text-left">
                <DialogTitle className="text-2xl font-semibold tracking-tight">{title}</DialogTitle>
                <DialogDescription asChild>
                  <div className="flex flex-col gap-1.5 text-left text-base text-muted-foreground">
                    {doctor?.email || doctorSummary?.email ? (
                      <span className="truncate">{doctor?.email ?? doctorSummary?.email}</span>
                    ) : null}
                    {(doctor?.mobile || doctorSummary?.mobile) ? (
                      <span className="text-sm">{doctor?.mobile ?? doctorSummary?.mobile}</span>
                    ) : null}
                    {doctorSummary && (doctorSummary.specializationNames || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(doctorSummary.specializationNames || []).map((name) => (
                          <Badge key={name} variant="secondary" className="font-normal">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-6 sm:px-10 sm:py-8">
          {!doctorId ? null : isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center py-10">
              <Loader title="Loading appointments" description="Almost there…" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="max-w-sm text-sm text-muted-foreground">{getErrorMessage(error)}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              <section aria-label="Appointment statistics" className="min-w-0">
                <h3 className="mb-4 text-base font-semibold text-foreground">Overview</h3>
                <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  <StatTile
                    label="Total appointments"
                    value={statsCards.total}
                    accent="default"
                    icon={<CalendarClock className="h-4 w-4" />}
                  />
                  <StatTile
                    label="Pending"
                    value={statsCards.pending}
                    accent="amber"
                    icon={<Clock3 className="h-4 w-4" />}
                  />
                  <StatTile
                    label="Completed"
                    value={statsCards.completed}
                    accent="emerald"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  />
                  <StatTile
                    label="Cancelled"
                    value={statsCards.cancelled}
                    accent="rose"
                    icon={<XCircle className="h-4 w-4" />}
                  />
                  <StatTile
                    label="Revenue (PKR)"
                    value={statsCards.hasEarned ? statsCards.earned.toFixed(2) : "—"}
                    accent="violet"
                    icon={<Wallet className="h-4 w-4" />}
                  />
                </div>
              </section>

              <Card className="min-w-0 border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Service offer</CardTitle>
                  <CardDescription>
                    Send/refresh a schedule offer for this doctor. Doctor can accept only when conflicts are resolved.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={surfaceInsetClass("space-y-3 p-3")}>
                    <p className="text-sm font-medium">Select catalog services</p>
                    {catalogServices.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No active catalog services. Add services in Hospital &gt; Services first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {catalogServices.map((service) => {
                          const checked = selectedCatalogServiceIds.includes(service.id);
                          return (
                            <label key={service.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs">
                              <span>
                                {service.serviceName}
                              </span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const enabled = e.target.checked;
                                  setSelectedCatalogServiceIds((prev) =>
                                    enabled ? [...prev, service.id] : prev.filter((id) => id !== service.id),
                                  );
                                }}
                                disabled={offersSubmitting}
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className={surfaceInsetClass("space-y-3 p-3")}>
                    <p className="text-sm font-medium">Add slot</p>
                    <div className="grid gap-2 md:grid-cols-4">
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={slotDraft.day}
                        onChange={(e) => setSlotDraft((prev) => ({ ...prev, day: e.target.value }))}
                        disabled={offersSubmitting}
                      >
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="time"
                        value={slotDraft.startTime}
                        onChange={(e) => setSlotDraft((prev) => ({ ...prev, startTime: e.target.value }))}
                        disabled={offersSubmitting}
                      />
                      <Input
                        type="time"
                        value={slotDraft.endTime}
                        onChange={(e) => setSlotDraft((prev) => ({ ...prev, endTime: e.target.value }))}
                        disabled={offersSubmitting}
                      />
                      <Button type="button" variant="secondary" onClick={handleAddSlotDraft} disabled={offersSubmitting}>
                        Add slot
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Each slot will be assigned to all currently selected catalog services.
                    </p>
                    {offeredSlots.length ? (
                      <div className="space-y-2">
                        {offeredSlots.map((slot, idx) => (
                          <div key={`${slot.day}-${slot.startTime}-${slot.endTime}-${idx}`} className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                            <span className="capitalize">
                              {slot.day} · {slot.startTime} - {slot.endTime}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSlotDraft(idx)}
                              disabled={offersSubmitting}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No slots added yet.</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleSaveOffer}
                      disabled={offersSubmitting || doctorSummary?.hospitalAffiliationStatus !== "active"}
                    >
                      {offersSubmitting ? "Saving…" : "Send offer"}
                    </Button>
                  </div>
                  {doctorSummary?.hospitalAffiliationStatus !== "active" ? (
                    <p className="text-xs text-muted-foreground">
                      Offer sending is enabled after doctor accepts invitation (active affiliation).
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Offer and affiliation & services history</p>
                    {doctorSummary?.hospitalAffiliationId ? (
                      <p className="text-xs text-muted-foreground">
                        Affiliation: {doctorSummary.hospitalAffiliationId} · Status: {doctorSummary.hospitalAffiliationStatus || "—"}
                      </p>
                    ) : null}
                    {offersLoading ? (
                      <p className="text-xs text-muted-foreground">Loading offers…</p>
                    ) : offers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No offers sent yet.</p>
                    ) : (
                      offers.map((offer) => (
                        <div key={offer.id} className={surfaceInsetClass("space-y-2 p-3 text-xs")}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">Status: {offer.status}</span>
                            <span>{new Date(offer.updatedAt).toLocaleString()}</span>
                          </div>
                          {(offer.services?.offeredServices || []).map((service, idx) => (
                            <div key={`${offer.id}-svc-${idx}`} className="rounded-md border border-border/60 p-2">
                              <p className="font-medium">
                                {service.serviceName} · {service.durationMinutes}m
                              </p>
                              {service.description ? <p className="text-muted-foreground">{service.description}</p> : null}
                            </div>
                          ))}
                          {(offer.services?.offeredSlots || []).length ? (
                            <div className="rounded-md border border-border/60 p-2">
                              <p className="mb-1 font-medium">Schedule slots</p>
                              <div className="flex flex-wrap gap-1">
                                {(offer.services?.offeredSlots || []).map((slot, idx) => (
                                  <span key={`${offer.id}-slot-${idx}`} className="rounded bg-muted px-2 py-0.5 capitalize">
                                    {slot.day} {slot.startTime}-{slot.endTime}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Separator className="bg-border/60" />

              <Card className="min-w-0 border-border/60 shadow-sm">
                <CardHeader className="min-w-0 gap-4 space-y-0 pb-4">
                  <div className="flex min-w-0 flex-col gap-4">
                    <div>
                      <CardTitle className="text-lg">Schedule</CardTitle>
                      <CardDescription className="mt-1">
                        {filteredAppointments.length === appointments.length
                          ? `${appointments.length} appointment${appointments.length === 1 ? "" : "s"}`
                          : `${filteredAppointments.length} shown of ${appointments.length}`}
                      </CardDescription>
                    </div>
                    <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full min-w-0">
                      <div className="-mx-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
                        <TabsList className="inline-flex h-auto min-h-10 w-max max-w-none flex-nowrap items-stretch justify-start gap-1 bg-muted/60 p-1">
                          <TabsTrigger
                            value="all"
                            className="shrink-0 flex-none rounded-md px-3 py-2 text-xs whitespace-nowrap"
                          >
                            All
                          </TabsTrigger>
                          <TabsTrigger
                            value="pending"
                            className="shrink-0 flex-none rounded-md px-3 py-2 text-xs whitespace-nowrap"
                          >
                            Pending
                          </TabsTrigger>
                          <TabsTrigger
                            value="in_progress"
                            className="shrink-0 flex-none rounded-md px-3 py-2 text-xs whitespace-nowrap"
                          >
                            In progress
                          </TabsTrigger>
                          <TabsTrigger
                            value="completed"
                            className="shrink-0 flex-none rounded-md px-3 py-2 text-xs whitespace-nowrap"
                          >
                            Completed
                          </TabsTrigger>
                          <TabsTrigger
                            value="cancelled"
                            className="shrink-0 flex-none rounded-md px-3 py-2 text-xs whitespace-nowrap"
                          >
                            Cancelled
                          </TabsTrigger>
                        </TabsList>
                      </div>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                  {grouped.length === 0 ? (
                    <div
                      className={cn(
                        surfaceInsetClass("flex flex-col items-center justify-center gap-2 py-14 text-center"),
                      )}
                    >
                      <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-foreground">
                        {appointments.length === 0 ? "No appointments yet" : "No matches for this filter"}
                      </p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        {appointments.length === 0
                          ? "Bookings for this doctor will appear here."
                          : "Try another status tab."}
                      </p>
                    </div>
                  ) : (
                    grouped.map(([day, rows]) => (
                      <section key={day} className="space-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CalendarDays className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold leading-tight">{formatDisplayDate(day)}</h4>
                            <p className="text-[11px] text-muted-foreground">
                              {rows.length} slot{rows.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-2.5 pl-0 sm:pl-10">
                          {rows.map((appt) => (
                            <li key={appt.id}>
                              <div
                                className={cn(
                                  "rounded-2xl border border-border/60 bg-muted/5 p-4 transition-colors hover:bg-muted/15",
                                  "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                                )}
                              >
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/60">
                                    <Clock className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="min-w-0 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-semibold tabular-nums text-foreground">
                                        {appt.appointmentTime}
                                      </span>
                                      <Badge variant={statusBadgeVariant(appt.status)} className="text-[11px] capitalize">
                                        {appt.status?.replace(/_/g, " ") || "—"}
                                      </Badge>
                                      <Badge variant="outline" className="text-[11px] capitalize">
                                        {appt.consultationMode || "—"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                      <User className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                      <span className="truncate font-medium text-foreground">{appt.patientName}</span>
                                      <span className="hidden truncate text-xs sm:inline">· {appt.patientEmail}</span>
                                    </div>
                                  </div>
                                </div>
                                {appt.paymentStatus ? (
                                  <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                                    <span className="block text-[10px] uppercase tracking-wide">Payment</span>
                                    <span className="font-medium text-foreground">{appt.paymentStatus}</span>
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
