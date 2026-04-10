"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/loader";
import { whatsappSettingsApi, chatbotPersonaApi } from "@/lib/whatsapp-chatbot-api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";

/** Used when there is no saved persona and no doctor profile to derive from (e.g. hospital). */
const fallbackServicesJson = `[
  {
    "serviceName": "Consultation",
    "price": 2000,
    "currency": "PKR",
    "description": "General consultation",
    "availabilitySlots": [
      { "startTime": "09:00", "endTime": "12:00", "isAvailable": true },
      { "startTime": "14:00", "endTime": "17:00", "isAvailable": true }
    ]
  }
]`;

const WhatsAppSettingsPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useCustomToast();
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [accessToken, setAccessToken] = useState("");
  /** From GET /settings/whatsapp — same as server mask (•••• + last 4). */
  const [savedAccessTokenMasked, setSavedAccessTokenMasked] = useState("");
  const [whatsappAppId, setWhatsappAppId] = useState("");
  /** Hospital-only: optional doctor UUID for booking. Doctors are linked automatically on the server. */
  const [hospitalDoctorId, setHospitalDoctorId] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [persona, setPersona] = useState("");
  const [servicesJson, setServicesJson] = useState(fallbackServicesJson);
  /** Doctor: JSON copied from onboarding-derived suggestion (for “reset” control). */
  const [profileServicesTemplate, setProfileServicesTemplate] = useState<string | null>(null);

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
        const [wa, cb] = await Promise.all([
          whatsappSettingsApi.get(),
          chatbotPersonaApi.get(),
        ]);
        if (cancelled) {
          return;
        }
        if (wa.account) {
          setPhoneNumberId(wa.account.phoneNumberId || "");
          setDisplayPhoneNumber(wa.account.displayPhoneNumber || "");
          setWhatsappAppId(wa.account.whatsappAppId || "");
          setSavedAccessTokenMasked(wa.account.accessTokenMasked || "");
          if (user?.role === "hospital") {
            setHospitalDoctorId(wa.account.doctorId || "");
          }
        } else {
          setSavedAccessTokenMasked("");
        }
        const p = cb.persona;
        const suggested = cb.suggestedServices;
        const fromProfile =
          suggested && Array.isArray(suggested) && suggested.length > 0
            ? JSON.stringify(suggested, null, 2)
            : null;
        setProfileServicesTemplate(fromProfile);

        const hasSavedServices = Boolean(
          p?.services && Array.isArray(p.services) && p.services.length > 0
        );
        const initialServicesJson = hasSavedServices
          ? JSON.stringify(p!.services, null, 2)
          : fromProfile ?? fallbackServicesJson;

        if (p) {
          setBusinessName(p.businessName || "");
          setOwnerName(p.ownerName || "");
          setPersona(p.persona || "");
          setServicesJson(initialServicesJson);
        } else {
          setServicesJson(initialServicesJson);
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

  const handleSaveWhatsApp = async () => {
    try {
      setSaving(true);
      await whatsappSettingsApi.patch({
        phoneNumberId,
        displayPhoneNumber: displayPhoneNumber || undefined,
        accessToken: accessToken || undefined,
        whatsappAppId,
        ...(user?.role === "hospital" ? { doctorId: hospitalDoctorId || undefined } : {}),
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
      setSaving(false);
    }
  };

  const handleSavePersona = async () => {
    let services: unknown[];
    try {
      services = JSON.parse(servicesJson);
      if (!Array.isArray(services)) {
        throw new Error("Services must be a JSON array");
      }
    } catch {
      showError("Invalid JSON", "Fix the services JSON before saving.");
      return;
    }
    try {
      setSaving(true);
      await chatbotPersonaApi.put({
        businessName,
        ownerName,
        persona,
        services,
      });
      showSuccess("Chatbot persona saved");
    } catch (e) {
      showError("Save failed", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleResetServicesFromProfile = () => {
    if (!profileServicesTemplate) {
      return;
    }
    setServicesJson(profileServicesTemplate);
  };

  const handleGeneratePersona = async () => {
    try {
      setSaving(true);
      const r = await chatbotPersonaApi.generate({
        businessName: businessName || "Clinic",
        ownerName: ownerName || "Doctor",
        about: persona.slice(0, 500),
      });
      if (r?.persona) {
        setPersona(r.persona);
        showSuccess("Persona draft generated — review and save");
      }
    } catch (e) {
      showError("Generation failed", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
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
          {user?.role === "hospital" ? (
            <div className="space-y-2">
              <Label htmlFor="hospitalDoctorId">Doctor for bookings (optional)</Label>
              <Input
                id="hospitalDoctorId"
                value={hospitalDoctorId}
                onChange={(e) => setHospitalDoctorId(e.target.value)}
                placeholder="Doctor profile UUID — who receives WhatsApp bookings"
                className="h-9"
                aria-describedby="hospitalDoctorId-hint"
              />
              <p id="hospitalDoctorId-hint" className="text-xs text-muted-foreground">
                Only needed for hospital-owned lines. Your doctors already have profiles in the system.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This line is linked to your doctor profile automatically for booking.
            </p>
          )}
          <Button type="button" onClick={handleSaveWhatsApp} disabled={saving} className="h-9">
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
          <Button type="button" variant="secondary" onClick={handleGeneratePersona} disabled={saving} className="h-9">
            Draft persona
          </Button>
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label htmlFor="servicesJson">Services on WhatsApp (JSON)</Label>
              {profileServicesTemplate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={handleResetServicesFromProfile}
                  aria-label="Replace services JSON with values from your doctor profile"
                >
                  Reset from profile
                </Button>
              ) : null}
            </div>
            {user?.role === "doctor" && profileServicesTemplate ? (
              <p className="text-xs text-muted-foreground">
                Prefilled from your onboarding (fee, opening/closing times, available days). Save persona once to store
                it; use reset if you change your profile later.
              </p>
            ) : null}
            <Textarea
              id="servicesJson"
              value={servicesJson}
              onChange={(e) => setServicesJson(e.target.value)}
              rows={14}
              className="font-mono text-xs min-h-[200px]"
              aria-label="Services JSON array for the WhatsApp assistant"
            />
          </div>
          <Button type="button" onClick={handleSavePersona} disabled={saving} className="h-9">
            Save persona
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSettingsPage;
