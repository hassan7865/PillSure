"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope } from "lucide-react";
import { appointmentApi } from "@/app/appointments/components/_api";
import type { HospitalCatalogService } from "@/app/appointments/components/_types";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { surfaceInsetClass } from "@/lib/dashboard-ui";

export default function HospitalServicesPage() {
  const { showError, showSuccess } = useCustomToast();
  const [rows, setRows] = useState<HospitalCatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    serviceName: "",
    description: "",
    durationMinutes: "30",
    rate: "",
    currency: "PKR" as const,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await appointmentApi.listHospitalServices());
    } catch (e) {
      showError("Could not load services", getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.serviceName.trim()) {
      showError("Missing service name", "Please enter a service name.");
      return;
    }
    const rate = Number(form.rate);
    if (!Number.isFinite(rate) || rate < 0) {
      showError("Invalid rate", "Rate must be a valid positive number.");
      return;
    }

    setSaving(true);
    try {
      await appointmentApi.createHospitalService({
        serviceName: form.serviceName.trim(),
        description: form.description.trim() || "",
        durationMinutes: Number(form.durationMinutes),
        rate,
        currency: "PKR",
      });
      showSuccess("Service added", "Hospital service catalog updated.");
      setForm({ serviceName: "", description: "", durationMinutes: "30", rate: "", currency: "PKR" });
      await load();
    } catch (e) {
      showError("Could not add service", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row: HospitalCatalogService) => {
    try {
      await appointmentApi.setHospitalServiceActive(row.id, !row.isActive);
      showSuccess("Service updated", row.isActive ? "Service deactivated." : "Service activated.");
      await load();
    } catch (e) {
      showError("Could not update service", getErrorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Hospital Services"
        description="Manage service catalog for offers. Currency is PKR for now."
        icon={Stethoscope}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Add service</CardTitle>
          <CardDescription>Create reusable services for doctor schedule offers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="svc-name">Service name</Label>
            <Input
              id="svc-name"
              value={form.serviceName}
              onChange={(e) => setForm((prev) => ({ ...prev, serviceName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-rate">Rate</Label>
            <Input
              id="svc-rate"
              type="number"
              min={0}
              value={form.rate}
              onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-duration">Duration</Label>
            <select
              id="svc-duration"
              value={form.durationMinutes}
              onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-currency">Currency</Label>
            <select
              id="svc-currency"
              value={form.currency}
              onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value as "PKR" }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="PKR">PKR</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="svc-desc">Description</Label>
            <Input
              id="svc-desc"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="button" onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "Add service"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catalog</CardTitle>
          <CardDescription>Active services can be attached in doctor offer slots.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading services...</p>
          ) : rows.length === 0 ? (
            <p className={surfaceInsetClass("p-3 text-sm text-muted-foreground")}>No services added yet.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className={surfaceInsetClass("flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between")}>
                <div>
                  <p className="font-medium">{row.serviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.durationMinutes}m · PKR {Number(row.rate || 0).toFixed(2)} {row.description ? `· ${row.description}` : ""}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void handleToggleActive(row)}>
                  {row.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
