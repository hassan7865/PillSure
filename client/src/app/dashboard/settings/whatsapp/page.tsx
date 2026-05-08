"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/loader";
import { whatsappSettingsApi, chatbotPersonaApi } from "@/lib/whatsapp-chatbot-api";
import { practiceApi, type PracticeAffiliationRow } from "@/lib/practice-api";
import { appointmentApi } from "@/app/appointments/components/_api";
import type { HospitalDoctorRow } from "@/app/appointments/components/_types";
import { onboardingApi } from "@/app/onboarding/_components/_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Loader2 } from "lucide-react";

/** Used when there is no saved persona and no doctor profile to derive from (e.g. hospital). */
const WHATSAPP_DEFAULT_PRACTICE_AUTO = "__auto__";

const practiceRowLabel = (r: PracticeAffiliationRow): string => {
  if (r.kind === "hospital") return (r.hospitalName || "").trim() || "Hospital";
  return "Private practice";
};

type ServiceAvailabilitySlotInput = {
  day: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

type ServiceInput = {
  serviceName: string;
  price: string;
  currency: string;
  slotDuration: string;
  description: string;
  availabilitySlots: ServiceAvailabilitySlotInput[];
};

const HHMM_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
});

const toMinutes = (hm: string): number | null => {
  const [h, m] = hm.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const fromMinutes = (total: number): string => {
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const getExpectedEndTime = (startTime: string, slotDuration: string): string => {
  const startMinutes = toMinutes(startTime);
  const duration = Number(slotDuration);
  if (startMinutes == null || !Number.isFinite(duration) || duration <= 0) return "";
  const endMinutes = startMinutes + duration;
  if (endMinutes > 24 * 60) return "";
  return fromMinutes(endMinutes);
};

const getEndTimeOptionsByDuration = (startTime: string, slotDuration: string): string[] => {
  const startMinutes = toMinutes(startTime);
  const duration = Number(slotDuration);
  if (startMinutes == null || !Number.isFinite(duration) || duration <= 0) return [];
  const out: string[] = [];
  for (let next = startMinutes + duration; next <= 24 * 60; next += duration) {
    out.push(fromMinutes(next));
  }
  return out;
};

const isValidEndForDuration = (startTime: string, endTime: string, slotDuration: string): boolean => {
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  const duration = Number(slotDuration);
  if (startMinutes == null || endMinutes == null || !Number.isFinite(duration) || duration <= 0) return false;
  if (endMinutes <= startMinutes) return false;
  return (endMinutes - startMinutes) % duration === 0;
};

const createDefaultSlot = (): ServiceAvailabilitySlotInput => ({
  day: "",
  startTime: "",
  endTime: "",
  isAvailable: true,
});

const createDefaultService = (): ServiceInput => ({
  serviceName: "",
  price: "",
  currency: "PKR",
  slotDuration: "30",
  description: "",
  availabilitySlots: [createDefaultSlot()],
});

const mapHospitalCatalogToServiceInputs = (
  rows: Array<{ serviceName: string; description: string | null; rate: string; currency: "PKR"; durationMinutes: number }>,
): ServiceInput[] =>
  rows.map((row) => ({
    serviceName: row.serviceName || "",
    price: String(row.rate || ""),
    currency: row.currency || "PKR",
    slotDuration: String(row.durationMinutes || 30),
    description: row.description || "",
    availabilitySlots: [createDefaultSlot()],
  }));

const normalizeServiceInputs = (input: unknown): ServiceInput[] => {
  if (!Array.isArray(input) || input.length === 0) {
    return [];
  }
  const rows = input
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row = item as Record<string, unknown>;
      const rawSlots = Array.isArray(row.availabilitySlots) ? row.availabilitySlots : [];
      const availabilitySlots = rawSlots
        .filter((slot) => slot && typeof slot === "object")
        .map((slot) => {
          const r = slot as Record<string, unknown>;
          return {
            day: String(r.day || "").trim(),
            startTime: String(r.startTime || "").slice(0, 5),
            endTime: String(r.endTime || "").slice(0, 5),
            isAvailable: r.isAvailable !== false,
          };
        })
        .filter((slot) => slot.day && slot.startTime && slot.endTime);
      return {
        serviceName: String(row.serviceName || "").trim(),
        price: row.price == null ? "" : String(row.price),
        currency: String(row.currency || "PKR").trim() || "PKR",
        slotDuration: row.slotDuration == null ? "30" : String(row.slotDuration),
        description: String(row.description || ""),
        availabilitySlots: availabilitySlots.length ? availabilitySlots : [createDefaultSlot()],
      };
    })
    .filter((row) => row.serviceName.length > 0);
  if (!rows.length) {
    return [];
  }
  return rows;
};

const buildSanitizedServices = (servicesList: ServiceInput[]) =>
  servicesList
    .map((service) => ({
      serviceName: service.serviceName.trim(),
      price:
        service.price.trim().length > 0 && Number.isFinite(Number(service.price))
          ? Number(service.price)
          : undefined,
      currency: service.currency.trim() || "PKR",
      slotDuration: service.slotDuration.trim() || "30",
      description: service.description.trim(),
      availabilitySlots: service.availabilitySlots
        .map((slot) => ({
          day: slot.day.trim(),
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable,
        }))
        .filter(
          (slot): slot is { day: string; startTime: string; endTime: string; isAvailable: boolean } =>
            Boolean(
              slot &&
                slot.day &&
                slot.startTime &&
                slot.endTime &&
                isValidEndForDuration(slot.startTime, slot.endTime, service.slotDuration),
            ),
        )
    }))
    .filter((service) => service.serviceName.length > 0 && service.availabilitySlots.length > 0);

const WhatsAppSettingsPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useCustomToast();
  const [pageLoading, setPageLoading] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [personaActionLoading, setPersonaActionLoading] = useState<"draft" | "save" | null>(null);

  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [accessToken, setAccessToken] = useState("");
  /** From GET /settings/whatsapp — same as server mask (•••• + last 4). */
  const [savedAccessTokenMasked, setSavedAccessTokenMasked] = useState("");
  const [whatsappAppId, setWhatsappAppId] = useState("");
  const [hospitalDoctors, setHospitalDoctors] = useState<HospitalDoctorRow[]>([]);
  const [allowedHospitalDoctorIds, setAllowedHospitalDoctorIds] = useState<string[]>([]);
  /** Doctor: optional default practice site for Meta bookings (private / hospital / clinic). */
  const [defaultPracticeAffiliationId, setDefaultPracticeAffiliationId] = useState<string>("");
  const [practiceAffiliationOptions, setPracticeAffiliationOptions] = useState<PracticeAffiliationRow[]>([]);

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [persona, setPersona] = useState("");
  const [lastDraftSourceKey, setLastDraftSourceKey] = useState("");
  const [servicesList, setServicesList] = useState<ServiceInput[]>([]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user || (user.role !== "doctor" && user.role !== "hospital")) {
      router.replace("/dashboard");
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setPageLoading(true);
        const [wa, cb] = await Promise.all([whatsappSettingsApi.get(), chatbotPersonaApi.get()]);
        let affiliations: PracticeAffiliationRow[] = [];
        let hospitalDoctorRows: HospitalDoctorRow[] = [];
        const signupOwnerName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
        let prefilledBusinessName = "";
        let prefilledOwnerName = signupOwnerName;
        if (user?.role === "doctor") {
          try {
            affiliations = await practiceApi.listAffiliations();
          } catch {
            affiliations = [];
          }
        }
        if (user?.role === "hospital") {
          try {
            const hospitalDoctorsPayload = await appointmentApi.getHospitalDoctors();
            hospitalDoctorRows = hospitalDoctorsPayload.doctors ?? [];
          } catch {
            hospitalDoctorRows = [];
          }
        }
        if (user?.role === "hospital") {
          try {
            const hospitalOnboarding = await onboardingApi.getHospitalOnboarding();
            prefilledBusinessName = String(hospitalOnboarding?.hospitalName || "").trim();
            const adminName = String(hospitalOnboarding?.adminName || "").trim();
            if (adminName) {
              prefilledOwnerName = adminName;
            }
          } catch {
            // Fall back to signup name only
          }
        }
        if (user?.role === "doctor" && !prefilledBusinessName) {
          prefilledBusinessName = signupOwnerName ? `Dr. ${signupOwnerName}` : "";
        }
        if (cancelled) {
          return;
        }
        if (wa.account) {
          setPhoneNumberId(wa.account.phoneNumberId || "");
          setDisplayPhoneNumber(wa.account.displayPhoneNumber || "");
          setWhatsappAppId(wa.account.whatsappAppId || "");
          setSavedAccessTokenMasked(wa.account.accessTokenMasked || "");
          if (user?.role === "hospital") {
            setHospitalDoctors(hospitalDoctorRows);
            const selectedDoctors = Array.isArray(wa.account.allowedDoctorIds)
              ? wa.account.allowedDoctorIds
              : wa.account.doctorId
                ? [wa.account.doctorId]
                : [];
            setAllowedHospitalDoctorIds(selectedDoctors);
          }
          if (user?.role === "doctor") {
            setPracticeAffiliationOptions(affiliations);
            setDefaultPracticeAffiliationId(wa.account.defaultPracticeAffiliationId || "");
          }
        } else {
          setSavedAccessTokenMasked("");
          if (user?.role === "doctor") {
            setPracticeAffiliationOptions(affiliations);
            setDefaultPracticeAffiliationId("");
          }
          if (user?.role === "hospital") {
            setHospitalDoctors(hospitalDoctorRows);
            setAllowedHospitalDoctorIds([]);
          }
        }
        const p = cb.persona;
        const suggested = cb.suggestedServices;
        const fromSuggested =
          suggested && Array.isArray(suggested) && suggested.length > 0
            ? normalizeServiceInputs(suggested)
            : null;

        const hasSavedServices = Boolean(
          p?.services && Array.isArray(p.services) && p.services.length > 0
        );
        const initialServicesList =
          user?.role === "doctor"
            ? []
            : hasSavedServices
              ? normalizeServiceInputs(p!.services)
              : fromSuggested ?? [];

        if (p) {
          const initialBusinessName = (p.businessName || "").trim() || prefilledBusinessName;
          const initialOwnerName = (p.ownerName || "").trim() || prefilledOwnerName;
          setBusinessName(initialBusinessName);
          setOwnerName(initialOwnerName);
          const initialPersona = p.persona || "";
          setPersona(initialPersona);
          setServicesList(initialServicesList);
          if (initialPersona.trim().length > 0) {
            setLastDraftSourceKey(
              JSON.stringify({
                businessName: initialBusinessName.trim(),
                ownerName: initialOwnerName.trim(),
                services: buildSanitizedServices(initialServicesList),
              }),
            );
          } else {
            setLastDraftSourceKey("");
          }
        } else {
          setBusinessName(prefilledBusinessName);
          setOwnerName(prefilledOwnerName);
          setServicesList(initialServicesList);
          setLastDraftSourceKey("");
        }
      } catch (e) {
        showError("Load failed", getErrorMessage(e));
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // showError from useCustomToast is a new function every render; including it
    // re-runs this effect, cancels the in-flight fetch, and skips setPageLoading(false) → infinite loader.
  }, [loading, user?.id, user?.role, router]);

  const activeAffiliationChoices = practiceAffiliationOptions.filter((r) => r.status === "active");
  const sanitizedServices = buildSanitizedServices(servicesList);
  const allRequiredInputsProvided =
    businessName.trim().length > 0 &&
    ownerName.trim().length > 0 &&
    (user?.role === "doctor" ||
      (servicesList.length > 0 &&
        servicesList.every((service) => {
      const hasPrice = service.price.trim().length > 0 && Number.isFinite(Number(service.price));
      const hasDuration =
        service.slotDuration.trim().length > 0 &&
        Number.isFinite(Number(service.slotDuration)) &&
        Number(service.slotDuration) > 0;
      const hasCoreFields =
        service.serviceName.trim().length > 0 &&
        service.description.trim().length > 0 &&
        service.currency.trim().length > 0 &&
        hasPrice &&
        hasDuration;
      const hasValidSlots =
        user?.role === "hospital"
          ? true
          : service.availabilitySlots.length > 0 &&
            service.availabilitySlots.every((slot) => {
              const validEndOptions = getEndTimeOptionsByDuration(slot.startTime, service.slotDuration);
              return (
                slot.day.trim().length > 0 &&
                slot.startTime.trim().length > 0 &&
                slot.endTime.trim().length > 0 &&
                validEndOptions.includes(slot.endTime)
              );
            });
      return hasCoreFields && hasValidSlots;
        })));
  const currentDraftSourceKey = JSON.stringify({
    businessName: businessName.trim(),
    ownerName: ownerName.trim(),
    services: user?.role === "doctor" ? [] : sanitizedServices,
  });
  const hasDraftedPersona =
    persona.trim().length > 0 &&
    lastDraftSourceKey.length > 0 &&
    lastDraftSourceKey === currentDraftSourceKey;

  const handleSaveWhatsApp = async () => {
    try {
      setSavingWhatsApp(true);
      await whatsappSettingsApi.patch({
        phoneNumberId,
        displayPhoneNumber: displayPhoneNumber || undefined,
        accessToken: accessToken || undefined,
        whatsappAppId,
        ...(user?.role === "hospital"
          ? {
              doctorId: null,
              allowedDoctorIds: allowedHospitalDoctorIds,
            }
          : {}),
        ...(user?.role === "doctor"
          ? {
              defaultPracticeAffiliationId:
                defaultPracticeAffiliationId.trim().length > 0 ? defaultPracticeAffiliationId.trim() : null,
            }
          : {}),
      });
      showSuccess("WhatsApp settings saved");
      const trimmed = accessToken.trim();
      if (trimmed.length >= 4) {
        setSavedAccessTokenMasked(`••••${trimmed.slice(-4)}`);
      }
      setAccessToken("");
    } catch (e) {
      showError("Save failed", getErrorMessage(e));
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleSavePersona = async () => {
    if (!hasDraftedPersona) {
      showError("Draft required", "Draft persona first, then save.");
      return;
    }
    try {
      setPersonaActionLoading("save");
      await chatbotPersonaApi.put({
        businessName,
        ownerName,
        persona,
        services: user?.role === "doctor" ? undefined : sanitizedServices,
      });
      showSuccess("Chatbot persona saved");
    } catch (e) {
      showError("Save failed", getErrorMessage(e));
    } finally {
      setPersonaActionLoading(null);
    }
  };

  const handleGeneratePersona = async () => {
    if (!allRequiredInputsProvided) {
      showError("Missing details", "Complete business, owner, and all service details before drafting.");
      return;
    }
    try {
      setPersonaActionLoading("draft");
      let resolvedServices = sanitizedServices;
      if (user?.role === "hospital") {
        const catalogRows = mapHospitalCatalogToServiceInputs(
          (await appointmentApi.listHospitalServices()).filter((row) => row.isActive),
        );
        if (catalogRows.length) {
          setServicesList(catalogRows);
        }
        resolvedServices = buildSanitizedServices(catalogRows.length ? catalogRows : servicesList).map((service) => ({
          ...service,
          availabilitySlots: [],
        }));
      }
      const r = await chatbotPersonaApi.generate({
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        services: user?.role === "doctor" ? undefined : resolvedServices,
        about: persona.slice(0, 500),
      });
      if (r?.persona) {
        setPersona(r.persona);
        setLastDraftSourceKey(currentDraftSourceKey);
        showSuccess("Persona draft generated — review and save");
      }
    } catch (e) {
      showError("Generation failed", getErrorMessage(e));
    } finally {
      setPersonaActionLoading(null);
    }
  };

  const handleToggleHospitalDoctor = (doctorId: string, checked: boolean) => {
    if (checked) {
      setAllowedHospitalDoctorIds((prev) => (prev.includes(doctorId) ? prev : [...prev, doctorId]));
      return;
    }
    setAllowedHospitalDoctorIds((prev) => prev.filter((id) => id !== doctorId));
  };

  const handleAddService = () => {
    setServicesList((prev) => [...prev, createDefaultService()]);
  };

  const handleRemoveService = (serviceIndex: number) => {
    setServicesList((prev) => prev.filter((_, index) => index !== serviceIndex));
  };

  const handleServiceFieldChange = (
    serviceIndex: number,
    field: keyof Omit<ServiceInput, "availabilitySlots">,
    value: string,
  ) => {
    setServicesList((prev) =>
      prev.map((service, index) => (index === serviceIndex ? { ...service, [field]: value } : service)),
    );
  };

  const handleAddAvailabilitySlot = (serviceIndex: number) => {
    setServicesList((prev) =>
      prev.map((service, index) =>
        index === serviceIndex
          ? { ...service, availabilitySlots: [...service.availabilitySlots, createDefaultSlot()] }
          : service,
      ),
    );
  };

  const handleRemoveAvailabilitySlot = (serviceIndex: number, slotIndex: number) => {
    setServicesList((prev) =>
      prev.map((service, index) => {
        if (index !== serviceIndex) {
          return service;
        }
        if (service.availabilitySlots.length <= 1) {
          return service;
        }
        return {
          ...service,
          availabilitySlots: service.availabilitySlots.filter((_, i) => i !== slotIndex),
        };
      }),
    );
  };

  const handleAvailabilitySlotChange = (
    serviceIndex: number,
    slotIndex: number,
    field: keyof ServiceAvailabilitySlotInput,
    value: string | boolean,
  ) => {
    setServicesList((prev) =>
      prev.map((service, index) => {
        if (index !== serviceIndex) {
          return service;
        }
        return {
          ...service,
          availabilitySlots: service.availabilitySlots.map((slot, i) =>
            i === slotIndex ? { ...slot, [field]: value } : slot,
          ),
        };
      }),
    );
  };

  if (loading || pageLoading) {
    return (
      <div className="p-6">
        <Loader title="Loading" description="Fetching WhatsApp settings…" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp & assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect Meta WhatsApp and tune how the assistant books appointments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meta WhatsApp</CardTitle>
          <CardDescription>
            Copy Phone number ID, App ID, and token from Meta → WhatsApp → API setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phoneNumberId">Phone number ID</Label>
            <Input
              id="phoneNumberId"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="From Meta API"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayPhoneNumber">Display phone number</Label>
            <Input
              id="displayPhoneNumber"
              value={displayPhoneNumber}
              onChange={(e) => setDisplayPhoneNumber(e.target.value)}
              placeholder="+92..."
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessToken">Access token</Label>
            <p id="accessToken-saved-hint" className="text-xs text-muted-foreground">
              {savedAccessTokenMasked ? (
                <>
                  Token on file: <span className="font-mono">{savedAccessTokenMasked}</span>
                  <span className="sr-only"> (last four characters visible)</span>
                </>
              ) : (
                <>No token saved yet — paste one on first save.</>
              )}
            </p>
            <Input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={
                savedAccessTokenMasked
                  ? "Paste only if you want to replace the saved token"
                  : "Paste permanent access token from Meta"
              }
              className="h-9"
              autoComplete="off"
              aria-describedby="accessToken-saved-hint"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappAppId">WhatsApp App ID</Label>
            <Input
              id="whatsappAppId"
              value={whatsappAppId}
              onChange={(e) => setWhatsappAppId(e.target.value)}
              className="h-9"
            />
          </div>
          {user?.role === "doctor" && activeAffiliationChoices.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="defaultPracticeAffiliation">Default practice for WhatsApp bookings</Label>
              <Select
                value={defaultPracticeAffiliationId.trim() ? defaultPracticeAffiliationId : WHATSAPP_DEFAULT_PRACTICE_AUTO}
                onValueChange={(v) =>
                  setDefaultPracticeAffiliationId(v === WHATSAPP_DEFAULT_PRACTICE_AUTO ? "" : v)
                }
              >
                <SelectTrigger
                  id="defaultPracticeAffiliation"
                  className="h-9 w-full"
                  aria-label="Default practice for WhatsApp bookings"
                >
                  <SelectValue placeholder="Automatic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WHATSAPP_DEFAULT_PRACTICE_AUTO}>Automatic (server default)</SelectItem>
                  {activeAffiliationChoices.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {practiceRowLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="defaultPracticeAffiliation-hint" className="text-xs text-muted-foreground">
                When you have several active sites, choose which practice site WhatsApp bookings use. Leave automatic
                unless you need a fixed site.
              </p>
            </div>
          ) : null}
          {user?.role === "hospital" ? (
            <div className="space-y-2">
              <Label>Doctors available on this WhatsApp line</Label>
              <div className="space-y-2 rounded-md border p-3">
                {hospitalDoctors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No affiliated doctors found yet. Add doctors in your hospital dashboard first.
                  </p>
                ) : (
                  hospitalDoctors.map((doctor) => {
                    const fullName = `${doctor.firstName} ${doctor.lastName}`.trim();
                    const checked = allowedHospitalDoctorIds.includes(doctor.id);
                    return (
                      <label
                        key={doctor.id}
                        className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{fullName || doctor.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{doctor.email}</p>
                        </div>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => handleToggleHospitalDoctor(doctor.id, value === true)}
                          aria-label={`Allow ${fullName || doctor.email} on WhatsApp`}
                        />
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Patients can be booked with any selected doctor. Leave all unchecked to allow any active affiliated
                doctor.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This line is linked to your doctor profile automatically for booking.
            </p>
          )}
          <Button type="button" onClick={handleSaveWhatsApp} disabled={savingWhatsApp} className="h-9">
            Save WhatsApp credentials
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chatbot persona</CardTitle>
          <CardDescription>
            How the assistant speaks and which services and time windows it can offer on WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner / doctor display name</Label>
              <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona">Persona text</Label>
            <Textarea id="persona" value={persona} onChange={(e) => setPersona(e.target.value)} rows={8} className="min-h-[160px]" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Services on WhatsApp</Label>
            </div>
            {user?.role === "hospital" ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Hospital services for persona are loaded automatically from Hospital Services catalog.
              </div>
            ) : user?.role === "doctor" ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Doctor services are managed in My Practices under Private affiliation services.
              </div>
            ) : (
            <div className="space-y-3">
              {servicesList.map((service, serviceIndex) => (
                <div key={`service-${serviceIndex}`} className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Service #{serviceIndex + 1}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveService(serviceIndex)}
                      disabled={servicesList.length <= 1}
                    >
                      Remove service
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Service name</Label>
                      <Input
                        value={service.serviceName}
                        onChange={(e) => handleServiceFieldChange(serviceIndex, "serviceName", e.target.value)}
                        placeholder="Consultation"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Input
                        value={service.description}
                        onChange={(e) => handleServiceFieldChange(serviceIndex, "description", e.target.value)}
                        placeholder="General consultation"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        min="0"
                        value={service.price}
                        onChange={(e) => handleServiceFieldChange(serviceIndex, "price", e.target.value)}
                        placeholder="2000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Currency</Label>
                      <Input
                        value={service.currency}
                        onChange={(e) => handleServiceFieldChange(serviceIndex, "currency", e.target.value)}
                        placeholder="PKR"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Duration (minutes)</Label>
                      <Select
                        value={service.slotDuration}
                        onValueChange={(value) => handleServiceFieldChange(serviceIndex, "slotDuration", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Availability slots</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleAddAvailabilitySlot(serviceIndex)}>
                        Add slot
                      </Button>
                    </div>
                    {service.availabilitySlots.map((slot, slotIndex) => (
                      <div
                        key={`service-${serviceIndex}-slot-${slotIndex}`}
                        className="space-y-3 rounded-md border p-3"
                      >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Day</Label>
                            <Select
                              value={slot.day}
                              onValueChange={(value) =>
                                handleAvailabilitySlotChange(serviceIndex, slotIndex, "day", value)
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Monday">Monday</SelectItem>
                                <SelectItem value="Tuesday">Tuesday</SelectItem>
                                <SelectItem value="Wednesday">Wednesday</SelectItem>
                                <SelectItem value="Thursday">Thursday</SelectItem>
                                <SelectItem value="Friday">Friday</SelectItem>
                                <SelectItem value="Saturday">Saturday</SelectItem>
                                <SelectItem value="Sunday">Sunday</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Start</Label>
                            <Select
                              value={slot.startTime}
                              onValueChange={(value) => {
                                handleAvailabilitySlotChange(serviceIndex, slotIndex, "startTime", value);
                                const validEnds = getEndTimeOptionsByDuration(value, service.slotDuration);
                                if (!validEnds.includes(slot.endTime)) {
                                  handleAvailabilitySlotChange(
                                    serviceIndex,
                                    slotIndex,
                                    "endTime",
                                    validEnds[0] || "",
                                  );
                                }
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select start time" />
                              </SelectTrigger>
                              <SelectContent>
                                {HHMM_OPTIONS.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>End</Label>
                            <Select
                              value={slot.endTime}
                              onValueChange={(value) =>
                                handleAvailabilitySlotChange(serviceIndex, slotIndex, "endTime", value)
                              }
                              disabled={!slot.startTime}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select end time" />
                              </SelectTrigger>
                              <SelectContent>
                                {getEndTimeOptionsByDuration(slot.startTime, service.slotDuration).map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={slot.isAvailable}
                              onCheckedChange={(value) =>
                                handleAvailabilitySlotChange(serviceIndex, slotIndex, "isAvailable", value === true)
                              }
                              aria-label="Mark slot available"
                            />
                            <span className="text-xs">Available</span>
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveAvailabilitySlot(serviceIndex, slotIndex)}
                            disabled={service.availabilitySlots.length <= 1}
                          >
                            Remove slot
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {servicesList.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No services yet. Add a service to configure WhatsApp booking options.
                </p>
              ) : null}
              <Button type="button" variant="outline" onClick={handleAddService}>
                Add service
              </Button>
            </div>
            )}
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleGeneratePersona}
              disabled={!allRequiredInputsProvided || personaActionLoading !== null}
              className="h-9"
            >
              {personaActionLoading === "draft" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Drafting persona...
                </>
              ) : (
                "Draft persona"
              )}
            </Button>
            {!allRequiredInputsProvided ? (
              <p className="text-xs text-muted-foreground">
                {user?.role === "doctor"
                  ? "Complete business name and owner name before drafting persona."
                  : "Complete business name, owner name, and all service fields before drafting persona."}
              </p>
            ) : null}
          </div>
          {hasDraftedPersona ? (
            <Button
              type="button"
              onClick={handleSavePersona}
              disabled={personaActionLoading !== null}
              className="h-9"
            >
              {personaActionLoading === "save" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving persona...
                </>
              ) : (
                "Save persona"
              )}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Save is enabled only after you generate a fresh draft persona from the current details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSettingsPage;
