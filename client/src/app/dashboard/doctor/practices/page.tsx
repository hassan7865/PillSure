"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Loader from "@/components/ui/loader";
import {
  practiceApi,
  type DoctorPracticeServiceRow,
  type DoctorBaseHalfHourSlotsResponse,
  type PracticeAffiliationRow,
} from "@/lib/practice-api";
import { appointmentApi } from "@/app/appointments/components/_api";
import type { HospitalDoctorOfferRow } from "@/app/appointments/components/_types";
import { getErrorMessage } from "@/lib/error-utils";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { surfaceInsetClass } from "@/lib/dashboard-ui";

const ORG_INVITE = "org_invite";

const practiceLabel = (r: PracticeAffiliationRow): string => {
  if (r.kind === "hospital" && r.hospitalName) return r.hospitalName;
  if (r.kind === "private") return "Private practice";
  return r.kind;
};

const buildOccupiedByOthers = (
  allRows: PracticeAffiliationRow[],
  excludeAffiliationId: string,
): Record<string, Set<string>> => {
  const out: Record<string, Set<string>> = {};
  const toMinutes = (hm: string): number | null => {
    const [h, m] = String(hm || "").split(":").map((x) => Number(x));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };
  const fromMinutes = (total: number): string => {
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  };
  for (const r of allRows) {
    if (r.id === excludeAffiliationId) continue;
    if (r.status !== "active" && r.status !== "pending") continue;
    const ws = r.weeklySchedule as
      | { bookableHalfHourSlotsByWeekday?: Record<string, string[]> }
      | Array<{ day?: string; startTime?: string; endTime?: string }>
      | null;

    if (Array.isArray(ws)) {
      for (const window of ws) {
        const day = String(window?.day || "").toLowerCase().trim();
        const start = toMinutes(String(window?.startTime || ""));
        const end = toMinutes(String(window?.endTime || ""));
        if (!day || start == null || end == null || end <= start) continue;
        if (!out[day]) out[day] = new Set();
        for (let t = start; t < end; t += 30) {
          out[day].add(fromMinutes(t));
        }
      }
      continue;
    }

    const by = ws?.bookableHalfHourSlotsByWeekday;
    if (!by || typeof by !== "object") continue;
    for (const [dayRaw, arr] of Object.entries(by)) {
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const day = dayRaw.toLowerCase();
      if (!out[day]) out[day] = new Set();
      for (const hm of arr) {
        out[day].add(String(hm).slice(0, 5));
      }
    }
  }
  return out;
};

const cloneSelectionFromRow = (
  row: PracticeAffiliationRow,
  base: DoctorBaseHalfHourSlotsResponse,
  occupiedByOthers: Record<string, Set<string>>,
): Record<string, Set<string>> => {
  const ws = row.weeklySchedule as { bookableHalfHourSlotsByWeekday?: Record<string, string[]> } | null;
  const saved = ws?.bookableHalfHourSlotsByWeekday;
  const out: Record<string, Set<string>> = {};
  for (const day of Object.keys(base.slotsByWeekday || {})) {
    const key = day.toLowerCase();
    const baseList = base.slotsByWeekday[key] ?? [];
    const taken = occupiedByOthers[key] ?? new Set<string>();
    const selectable = baseList.filter((hm) => !taken.has(hm));
    const picked = saved?.[key] ?? saved?.[day];
    if (Array.isArray(picked) && picked.length > 0) {
      out[key] = new Set(
        picked
          .map((x) => String(x).slice(0, 5))
          .filter((hm) => baseList.includes(hm) && !taken.has(hm)),
      );
    } else {
      // No saved template: start unchecked so the doctor assigns slots explicitly.
      out[key] = new Set();
    }
  }
  return out;
};

const getAvailableSlotsByDay = (
  base: DoctorBaseHalfHourSlotsResponse,
  occupiedByOthers: Record<string, Set<string>>,
): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const day of Object.keys(base.slotsByWeekday || {})) {
    const key = day.toLowerCase();
    const baseList = base.slotsByWeekday[key] ?? [];
    const taken = occupiedByOthers[key] ?? new Set<string>();
    out[key] = baseList.filter((hm) => !taken.has(hm));
  }
  return out;
};

/** True when every onboarding slot that is still free (not taken by another affiliation) is selected. */
const isMaxSelectableSelection = (
  sel: Record<string, Set<string>>,
  base: DoctorBaseHalfHourSlotsResponse,
  occupiedByOthers: Record<string, Set<string>>,
): boolean => {
  for (const day of Object.keys(base.slotsByWeekday || {})) {
    const key = day.toLowerCase();
    const baseList = base.slotsByWeekday[key] ?? [];
    const taken = occupiedByOthers[key] ?? new Set<string>();
    const selectable = baseList.filter((hm) => !taken.has(hm));
    const s = sel[key] ?? new Set<string>();
    if (selectable.length === 0) continue;
    if (s.size !== selectable.length) return false;
    for (const t of selectable) {
      if (!s.has(t)) return false;
    }
  }
  return true;
};

const DoctorPracticesPage = () => {
  const { showError, showSuccess } = useCustomToast();
  const [rows, setRows] = useState<PracticeAffiliationRow[] | null>(null);
  const [baseGrid, setBaseGrid] = useState<DoctorBaseHalfHourSlotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hospitalId, setHospitalId] = useState("");
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionScope, setExceptionScope] = useState("");
  const [privateServices, setPrivateServices] = useState<DoctorPracticeServiceRow[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");

  const [slotDialogRow, setSlotDialogRow] = useState<PracticeAffiliationRow | null>(null);
  const [slotSelection, setSlotSelection] = useState<Record<string, Set<string>>>({});
  const [slotOccupiedByOthers, setSlotOccupiedByOthers] = useState<Record<string, Set<string>>>({});
  const [slotAvailableByDay, setSlotAvailableByDay] = useState<Record<string, string[]>>({});
  const [slotSaving, setSlotSaving] = useState(false);
  const [offers, setOffers] = useState<HospitalDoctorOfferRow[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerActionId, setOfferActionId] = useState<string | null>(null);
  const [offerRecheckId, setOfferRecheckId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setOffersLoading(true);
    setServicesLoading(true);
    try {
      const [data, base, doctorOffers] = await Promise.all([
        practiceApi.listAffiliations(),
        practiceApi.getBaseHalfHourSlots(),
        appointmentApi.getDoctorOffers(),
      ]);
      setRows(data);
      setBaseGrid(base);
      setOffers(doctorOffers);
      const privateAffiliation = data.find((r) => r.kind === "private" && r.status === "active");
      if (privateAffiliation) {
        const myServices = await practiceApi.listMyServices(privateAffiliation.id);
        setPrivateServices(myServices);
      } else {
        setPrivateServices([]);
      }
    } catch (e) {
      showError("Could not load practices", getErrorMessage(e));
      setRows([]);
      setBaseGrid(null);
      setOffers([]);
      setPrivateServices([]);
    } finally {
      setLoading(false);
      setOffersLoading(false);
      setServicesLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingOrgInvites = useMemo(
    () => (rows || []).filter((r) => r.status === "pending" && r.invitationSource === ORG_INVITE),
    [rows],
  );

  const pendingDoctorRequests = useMemo(
    () => (rows || []).filter((r) => r.status === "pending" && r.invitationSource !== ORG_INVITE),
    [rows],
  );

  const handleEnsurePrivate = async () => {
    try {
      await practiceApi.ensurePrivate();
      showSuccess("Private practice ready", "You can set hours on the private affiliation row.");
      await load();
    } catch (e) {
      showError("Failed", getErrorMessage(e));
    }
  };

  const handleRequestHospital = async () => {
    const id = hospitalId.trim();
    if (!id) {
      showError("Missing id", "Paste the hospital UUID from your administrator.");
      return;
    }
    try {
      await practiceApi.requestHospital(id);
      showSuccess("Request sent", "The hospital admin can approve your affiliation.");
      setHospitalId("");
      await load();
    } catch (e) {
      showError("Request failed", getErrorMessage(e));
    }
  };

  const handleCreatePrivateService = async () => {
    const privateAffiliation = (rows || []).find((r) => r.kind === "private" && r.status === "active");
    if (!privateAffiliation) {
      showError("Private affiliation required", "Enable private practice first.");
      return;
    }
    if (!newServiceName.trim()) {
      showError("Missing service name", "Enter a service name.");
      return;
    }
    const price = Number(newServicePrice);
    if (!Number.isFinite(price) || price <= 0) {
      showError("Invalid price", "Price must be a positive number.");
      return;
    }
    setServiceSaving(true);
    try {
      await practiceApi.createMyService({
        practiceAffiliationId: privateAffiliation.id,
        serviceName: newServiceName.trim(),
        description: newServiceDescription.trim() || undefined,
        durationMinutes: 30,
        pricePkr: price,
      });
      showSuccess("Service added", "Private affiliation service saved.");
      setNewServiceName("");
      setNewServiceDescription("");
      setNewServicePrice("");
      await load();
    } catch (e) {
      showError("Could not add service", getErrorMessage(e));
    } finally {
      setServiceSaving(false);
    }
  };

  const handleDeletePrivateService = async (serviceId: string) => {
    setServiceSaving(true);
    try {
      await practiceApi.deleteMyService(serviceId);
      showSuccess("Service removed", "Private affiliation service removed.");
      await load();
    } catch (e) {
      showError("Could not remove service", getErrorMessage(e));
    } finally {
      setServiceSaving(false);
    }
  };

  const handleAddLeave = async () => {
    if (!exceptionDate.trim()) {
      showError("Missing date", "Use YYYY-MM-DD.");
      return;
    }
    try {
      await practiceApi.addException({
        exceptionDate: exceptionDate.trim(),
        isFullDay: true,
        reason: "Leave",
        practiceAffiliationId: exceptionScope.trim() || null,
      });
      showSuccess("Saved", "Availability exception recorded.");
      setExceptionDate("");
      setExceptionScope("");
    } catch (e) {
      showError("Failed", getErrorMessage(e));
    }
  };

  const handleAcceptInvite = async (id: string) => {
    try {
      await practiceApi.acceptOrgInvite(id);
      showSuccess("Accepted", "You are now linked to this practice.");
      await load();
    } catch (e) {
      showError("Could not accept", getErrorMessage(e));
    }
  };

  const handleRejectInvite = async (id: string) => {
    try {
      await practiceApi.rejectOrgInvite(id);
      showSuccess("Declined", "The invitation was dismissed.");
      await load();
    } catch (e) {
      showError("Could not decline", getErrorMessage(e));
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    setOfferActionId(offerId);
    try {
      await appointmentApi.acceptDoctorOffer(offerId);
      showSuccess("Offer accepted", "Services and schedule were activated for this affiliation.");
      await load();
    } catch (e) {
      showError("Could not accept offer", getErrorMessage(e));
    } finally {
      setOfferActionId(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    setOfferActionId(offerId);
    try {
      await appointmentApi.rejectDoctorOffer(offerId);
      showSuccess("Offer rejected", "Offer was rejected.");
      await load();
    } catch (e) {
      showError("Could not reject offer", getErrorMessage(e));
    } finally {
      setOfferActionId(null);
    }
  };

  const handleRecheckOfferConflicts = async (offerId: string) => {
    setOfferRecheckId(offerId);
    try {
      const result = await appointmentApi.recheckDoctorOfferConflicts(offerId);
      if (result.isReadyToAccept) {
        showSuccess("Conflicts resolved", "Offer is ready. You can now accept or reject.");
      } else {
        showError("Conflicts still exist", "Offer conflicts were refreshed. Please adjust schedule and try again.");
      }
      await load();
    } catch (e) {
      showError("Could not recheck conflicts", getErrorMessage(e));
    } finally {
      setOfferRecheckId(null);
    }
  };

  const handleOpenSlotDialog = (row: PracticeAffiliationRow) => {
    if (row.kind !== "private") {
      showError(
        "Read-only for organization offers",
        "Hospital-provided schedules are read-only. You can only Accept or Reject those offers.",
      );
      return;
    }
    if (!baseGrid) {
      showError("Profile hours missing", "Set your overall availability in doctor onboarding / profile first.");
      return;
    }
    if (baseGrid.profileComplete === false) {
      showError(
        "Complete onboarding first",
        "Add your available days and opening/closing times in doctor onboarding so we can build 30-minute slots from that window only.",
      );
      return;
    }
    if (row.status !== "active" && row.status !== "pending") {
      showError("Not editable", "Only active or pending affiliations can carry a slot template.");
      return;
    }
    const occ = buildOccupiedByOthers(rows ?? [], row.id);
    const availableByDay = getAvailableSlotsByDay(baseGrid, occ);
    setSlotOccupiedByOthers(occ);
    setSlotAvailableByDay(availableByDay);
    setSlotDialogRow(row);
    setSlotSelection(cloneSelectionFromRow(row, baseGrid, occ));
  };

  const handleToggleSlot = (dayKey: string, hm: string) => {
    const d = dayKey.toLowerCase();
    if (slotOccupiedByOthers[d]?.has(hm)) {
      return;
    }
    setSlotSelection((prev) => {
      const next: Record<string, Set<string>> = { ...prev };
      const cur = new Set(next[d] ?? []);
      if (cur.has(hm)) cur.delete(hm);
      else cur.add(hm);
      next[d] = cur;
      return next;
    });
  };

  const handleSaveSlots = async () => {
    if (!slotDialogRow || !baseGrid) return;
    setSlotSaving(true);
    try {
      const payload: Record<string, string[]> = {};
      for (const day of Object.keys(baseGrid.slotsByWeekday || {})) {
        const key = day.toLowerCase();
        const chosen = Array.from(slotSelection[key] ?? []).sort();
        payload[key] = chosen;
      }
      const bookableHalfHourSlotsByWeekday = isMaxSelectableSelection(slotSelection, baseGrid, slotOccupiedByOthers)
        ? null
        : payload;
      const privateServicesForSchedule = privateServices.map((service) => ({
        id: service.id,
        serviceName: service.serviceName,
        description: service.description ?? "",
        durationMinutes: Number(service.durationMinutes || 30),
        pricePkr: Number(service.pricePkr || 0),
      }));

      await practiceApi.updateSchedule(slotDialogRow.id, {
        services: privateServicesForSchedule,
        bookableHalfHourSlotsByWeekday,
      });
      showSuccess("Saved", "30-minute slots for this practice site were updated.");
      setSlotDialogRow(null);
      setSlotOccupiedByOthers({});
      setSlotAvailableByDay({});
      await load();
    } catch (e) {
      showError("Could not save slots", getErrorMessage(e));
    } finally {
      setSlotSaving(false);
    }
  };

  const weekdayOrder = useMemo(() => {
    const order = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const keys = Object.keys(baseGrid?.slotsByWeekday ?? {}).map((k) => k.toLowerCase());
    return order.filter((d) => keys.includes(d));
  }, [baseGrid]);

  const offersByAffiliation = useMemo(() => {
    const map = new Map<string, HospitalDoctorOfferRow[]>();
    for (const offer of offers) {
      const key = offer.practiceAffiliationId;
      const list = map.get(key) ?? [];
      list.push(offer);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    }
    return map;
  }, [offers]);

  const actionableOffers = useMemo(
    () =>
      offers.filter(
        (offer) => offer.isActive && offer.doctorDecision == null && offer.status !== "accepted" && offer.status !== "rejected",
      ),
    [offers],
  );

  if (loading && !rows) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader title="Loading" description="Fetching practice affiliations…" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="My practices"
        description="Accept invitations, request affiliations, and assign non-overlapping 30-minute slots per site within your profile hours."
        icon={Layers}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={handleEnsurePrivate}>
          Enable / refresh private practice
        </Button>
      </div>

      {pendingOrgInvites.length > 0 ? (
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Pending invitations</CardTitle>
            <CardDescription>
              A hospital invited you. Accept to join, or decline to dismiss the invite.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingOrgInvites.map((r) => (
              <div
                key={r.id}
                className={surfaceInsetClass("flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between")}
              >
                <div>
                  <div className="font-medium">{practiceLabel(r)}</div>
                  <div className="text-xs text-muted-foreground">Invitation · {r.kind}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => void handleAcceptInvite(r.id)}>
                    Accept
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleRejectInvite(r.id)}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {pendingDoctorRequests.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Awaiting organization approval</CardTitle>
            <CardDescription>These are requests you sent; the hospital admin will approve or reject.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingDoctorRequests.map((r) => (
              <div key={r.id} className={surfaceInsetClass("p-3 text-sm")}>
                <div className="font-medium">{practiceLabel(r)}</div>
                <div className="text-xs text-muted-foreground">Pending request · {r.kind}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Incoming hospital service offers</CardTitle>
          <CardDescription>
            Review pending hospital-assigned services and schedule slots. Accepted/rejected offers are shown in affiliation history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {offersLoading ? (
            <p className="text-sm text-muted-foreground">Loading offers…</p>
          ) : actionableOffers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incoming offers right now.</p>
          ) : (
            actionableOffers.map((offer) => {
              const conflicted = (offer.conflicts?.length ?? 0) > 0;
              const busy = offerActionId === offer.id;
              const rechecking = offerRecheckId === offer.id;
              return (
                <div key={offer.id} className={surfaceInsetClass("space-y-3 p-3")}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Status: {offer.status}</p>
                      <p className="text-xs text-muted-foreground">Offer id: {offer.id}</p>
                    </div>
                    <div className="flex gap-2">
                      {conflicted ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleRecheckOfferConflicts(offer.id)}
                          disabled={busy || rechecking}
                        >
                          {rechecking ? "Checking…" : "Check conflicts again"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleAcceptOffer(offer.id)}
                        disabled={busy || rechecking || conflicted}
                      >
                        {busy ? "Processing…" : "Accept"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleRejectOffer(offer.id)}
                        disabled={busy || rechecking}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {(offer.services?.offeredServices || []).map((service, idx) => (
                      <div key={`${service.serviceName}-${idx}`} className="rounded-md border border-border/60 p-2">
                        <p className="font-medium">
                          {service.serviceName} · {service.durationMinutes}m
                        </p>
                        {service.description ? <p className="text-muted-foreground">{service.description}</p> : null}
                      </div>
                    ))}
                    {(offer.services?.offeredSlots || []).length ? (
                      <div className="rounded-md border border-border/60 p-2">
                        <p className="mb-1 font-medium">Offered slots</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(offer.services?.offeredSlots || []).map((slot, sidx) => (
                            <span key={`${slot.day}-${slot.startTime}-${slot.endTime}-${sidx}`} className="rounded bg-muted px-2 py-0.5 capitalize">
                              {slot.day} {slot.startTime}-{slot.endTime}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {offer.conflicts?.length ? (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                      {offer.conflicts.map((conflict, idx) => (
                        <p key={`${conflict.code}-${idx}`}>
                          {conflict.day} {conflict.startTime}-{conflict.endTime}: {conflict.message}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Request affiliation</CardTitle>
          <CardDescription>Ask to join a hospital by ID (admin shares this from their dashboard).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-1">
          <div className={surfaceInsetClass("space-y-2 p-3")}>
            <Label htmlFor="req-hosp">Hospital ID</Label>
            <Input id="req-hosp" value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} placeholder="uuid" />
            <Button type="button" size="sm" onClick={handleRequestHospital}>
              Request hospital
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Private affiliation services</CardTitle>
          <CardDescription>
            Manage services for your private affiliation here. WhatsApp persona for doctors reads from this list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="private-service-name">Service name</Label>
              <Input
                id="private-service-name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Consultation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="private-service-price">Price (PKR)</Label>
              <Input
                id="private-service-price"
                type="number"
                min="0"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                placeholder="2000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="private-service-duration">Duration (minutes)</Label>
              <Input id="private-service-duration" value="30" readOnly aria-readonly="true" disabled />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="private-service-description">Description</Label>
              <Input
                id="private-service-description"
                value={newServiceDescription}
                onChange={(e) => setNewServiceDescription(e.target.value)}
                placeholder="General consultation"
              />
            </div>
          </div>
          <Button type="button" onClick={() => void handleCreatePrivateService()} disabled={serviceSaving}>
            {serviceSaving ? "Saving…" : "Add private service"}
          </Button>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Saved private services</p>
            {servicesLoading ? (
              <p className="text-xs text-muted-foreground">Loading services…</p>
            ) : privateServices.length === 0 ? (
              <p className="text-xs text-muted-foreground">No private services yet.</p>
            ) : (
              privateServices.map((service) => (
                <div key={service.id} className={surfaceInsetClass("flex items-center justify-between p-2 text-xs")}>
                  <div>
                    <p className="font-medium">
                      {service.serviceName} · {service.durationMinutes}m · PKR {service.pricePkr}
                    </p>
                    {service.description ? <p className="text-muted-foreground">{service.description}</p> : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleDeletePrivateService(service.id)}
                    disabled={serviceSaving}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Full-day leave (global or site)</CardTitle>
          <CardDescription>
            Leave affiliation ID empty for doctor-wide leave, or paste an affiliation id to block only that site.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="ex-date">Date (YYYY-MM-DD)</Label>
            <Input id="ex-date" value={exceptionDate} onChange={(e) => setExceptionDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-scope">Affiliation ID (optional)</Label>
            <Input id="ex-scope" value={exceptionScope} onChange={(e) => setExceptionScope(e.target.value)} />
          </div>
          <Button type="button" onClick={handleAddLeave}>
            Save leave
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Affiliations</CardTitle>
          <CardDescription>
            Status: pending, active, suspended, ended. Use &quot;30-minute slots&quot; to carve which half hours apply to
            each site (must stay within your profile hours and cannot overlap another site).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(rows || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No affiliations yet.</p>
          ) : (
            (rows || []).map((r) => (
              <div key={r.id} className={surfaceInsetClass("space-y-2 p-3 text-sm")}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium">
                      {practiceLabel(r)} · {r.status}
                    </div>
                    <div className="text-muted-foreground">
                      {r.kind === "hospital" && r.hospitalName ? `Hospital: ${r.hospitalName}` : null}
                      {r.kind === "private" ? "Private practice" : null}
                    </div>
                    <div className="text-xs text-muted-foreground">id: {r.id}</div>
                  </div>
                  {r.kind === "private" && r.status === "active" ? (
                    <Button type="button" size="sm" variant="secondary" onClick={() => handleOpenSlotDialog(r)}>
                      30-minute slots…
                    </Button>
                  ) : null}
                </div>
                <div className="mt-2 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Services history for this affiliation</p>
                  {(offersByAffiliation.get(r.id) || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No service offers yet for this affiliation.</p>
                  ) : (
                    (offersByAffiliation.get(r.id) || []).map((offer) => (
                      <div key={offer.id} className="rounded-md border border-border/60 p-2 text-xs">
                        <p className="font-medium">
                          Offer {offer.status} · {new Date(offer.updatedAt).toLocaleString()}
                        </p>
                        <div className="mt-1 space-y-1">
                          {(offer.services?.offeredServices || []).map((service, idx) => (
                            <p key={`${offer.id}-aff-svc-${idx}`}>
                              {service.serviceName} · {service.durationMinutes}m
                            </p>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(slotDialogRow)}
        onOpenChange={(open) => {
          if (!open) {
            setSlotDialogRow(null);
            setSlotOccupiedByOthers({});
            setSlotAvailableByDay({});
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>30-minute slots · {slotDialogRow ? practiceLabel(slotDialogRow) : ""}</DialogTitle>
            <DialogDescription>
              Only times from your onboarding (available days + open/close) appear here. Nothing is selected until you
              check the slots for this site. Only slots that are still free for this affiliation are shown.
            </DialogDescription>
          </DialogHeader>
          {baseGrid && slotDialogRow ? (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">
                Onboarding window: {baseGrid.openingTime ?? "—"}–{baseGrid.closingTime ?? "—"} on your selected days
                only.
              </p>
              <p className="text-xs text-muted-foreground">
                Slots already used by other affiliations are hidden.
              </p>
              {weekdayOrder.map((day) => {
                const slots = slotAvailableByDay[day] ?? [];
                if (slots.length === 0) return null;
                return (
                  <div key={day} className="space-y-2">
                    <div className="text-sm font-semibold capitalize">{day}</div>
                    <div className="flex flex-wrap gap-2">
                      {slots.map((hm) => {
                        const checked = slotSelection[day]?.has(hm) ?? false;
                        const slotId = `${day}-${hm}`;
                        return (
                          <label
                            key={slotId}
                            htmlFor={slotId}
                            title={`${day} ${hm}`}
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1 text-xs"
                          >
                            <Checkbox
                              id={slotId}
                              checked={checked}
                              onCheckedChange={() => handleToggleSlot(day, hm)}
                              aria-label={`${day} ${hm}`}
                            />
                            <span>{hm}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSlotDialogRow(null)} disabled={slotSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSaveSlots()} disabled={slotSaving || !slotDialogRow}>
              {slotSaving ? "Saving…" : "Save slots"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DoctorPracticesPage;
