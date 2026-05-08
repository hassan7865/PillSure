"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ListingPanel } from "@/components/shell/listing-panel";
import { Button } from "@/components/ui/button";
import { useHospitalDoctors } from "@/app/appointments/use-appointments";
import { appointmentApi } from "@/app/appointments/components/_api";
import { ArrowLeft, Stethoscope, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { surfaceInsetClass } from "@/lib/dashboard-ui";
import { getErrorMessage } from "@/lib/error-utils";
import { useCustomToast } from "@/hooks/use-custom-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/shell/app-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HospitalDoctorDetailDialog } from "./_components/doctor-detail-dialog";

export default function HospitalDoctorsPage() {
  const { showError, showSuccess } = useCustomToast();
  const {
    data: doctorsPayload,
    isLoading: doctorsLoading,
    error: doctorsError,
    refetch: refetchDoctors,
  } = useHospitalDoctors();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [detailDoctorId, setDetailDoctorId] = useState<string | null>(null);

  const detailDoctorSummary = useMemo(
    () => doctorsPayload?.doctors?.find((d) => d.id === detailDoctorId),
    [doctorsPayload?.doctors, detailDoctorId],
  );

  const resetForm = () => {
    setForm({ firstName: "", lastName: "", email: "", password: "" });
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      showError("Missing email", "Enter the doctor account email.");
      return;
    }
    setInviteSubmitting(true);
    try {
      const res = await appointmentApi.inviteHospitalDoctor(email);
      const pending = res.status === "pending";
      showSuccess(
        pending ? "Invitation sent" : "Doctor linked",
        res.message ?? (pending ? "The doctor must accept the invite under My practices." : "They are now affiliated with your hospital."),
      );
      setInviteOpen(false);
      setInviteEmail("");
      await refetchDoctors();
    } catch (err) {
      showError("Invite failed", getErrorMessage(err));
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { firstName, lastName, email, password } = form;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      showError("Missing fields", "Please fill in first name, last name, email, and password.");
      return;
    }
    setSubmitting(true);
    try {
      await appointmentApi.createHospitalDoctor({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      showSuccess("Doctor invited", "They can sign in with this email and complete onboarding.");
      setRegisterOpen(false);
      resetForm();
      await refetchDoctors();
    } catch (err) {
      showError("Could not create doctor", getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const doctors = doctorsPayload?.doctors ?? [];

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground">
          <Link href="/dashboard/hospital">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Doctors"
        description="Affiliated doctors at your hospital. Register accounts so they can sign in and finish onboarding."
        icon={Stethoscope}
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setInviteOpen(true)}>
              Invite existing doctor
            </Button>
            <Button type="button" className="gap-2" onClick={() => setRegisterOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Register new doctor
            </Button>
          </div>
        }
      />

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          if (inviteSubmitting) return;
          setInviteOpen(open);
          if (!open) setInviteEmail("");
        }}
      >
        <AppDialogContent size="sm" className="sm:max-w-md">
          <form onSubmit={handleInviteSubmit}>
            <DialogHeader>
              <DialogTitle>Invite existing doctor</DialogTitle>
              <DialogDescription>
                Enter the email of a doctor who already has a PillSure account. They will be linked to your hospital.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Doctor email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviteSubmitting}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} disabled={inviteSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteSubmitting}>
                {inviteSubmitting ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      <Dialog
        open={registerOpen}
        onOpenChange={(open) => {
          if (submitting) return;
          setRegisterOpen(open);
          if (!open) resetForm();
        }}
      >
        <AppDialogContent
          size="sm"
          className="sm:max-w-md"
          onPointerDownOutside={(e) => submitting && e.preventDefault()}
        >
          <form onSubmit={handleRegisterSubmit}>
            <DialogHeader>
              <DialogTitle>Register a doctor</DialogTitle>
              <DialogDescription>
                Creates the same kind of account as signing up with role doctor. They will complete profile details after
                first login.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hd-first">First name</Label>
                  <Input
                    id="hd-first"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hd-last">Last name</Label>
                  <Input
                    id="hd-last"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hd-email">Email</Label>
                <Input
                  id="hd-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hd-password">Password</Label>
                <Input
                  id="hd-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  disabled={submitting}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRegisterOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      <HospitalDoctorDetailDialog
        open={detailDoctorId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailDoctorId(null);
        }}
        doctorId={detailDoctorId}
        doctorSummary={detailDoctorSummary}
      />

      <ListingPanel
        header={
          <CardHeader>
            <CardTitle className="text-lg">All doctors</CardTitle>
            <CardDescription>
              {doctorsPayload?.stats ? (
                <>
                  {doctorsPayload.stats.activeDoctors} active
                  {doctorsPayload.stats.inactiveDoctors > 0
                    ? ` · ${doctorsPayload.stats.inactiveDoctors} inactive`
                    : ""}
                  {" · "}
                  {doctorsPayload.stats.totalAppointments} appointments across doctors
                </>
              ) : (
                "Loading summary…"
              )}
            </CardDescription>
          </CardHeader>
        }
        isLoading={doctorsLoading}
        loadingTitle="Loading doctors"
        loadingDescription="Fetching affiliated doctors..."
        error={doctorsError ? getErrorMessage(doctorsError) : null}
        isEmpty={!doctorsLoading && !doctorsError && doctors.length === 0}
        empty={
          <div className={surfaceInsetClass("mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-xl px-6 py-8 text-center")}>
            <p className="text-sm text-muted-foreground">No affiliated doctors yet.</p>
            <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={() => setRegisterOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Register your first doctor
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor</TableHead>
                <TableHead className="hidden sm:table-cell">Specializations</TableHead>
                <TableHead className="w-[140px]">Profile status</TableHead>
                <TableHead className="w-[180px]">Invitation status</TableHead>
                <TableHead className="text-right">Appointments</TableHead>
                <TableHead className="text-right">Earned (PKR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setDetailDoctorId(d.id)}
                >
                  <TableCell>
                    <div className="font-medium">
                      {d.firstName} {d.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{d.email}</div>
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate text-sm sm:table-cell">
                    {(d.specializationNames || []).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge variant={d.isActive ? "default" : "outline"} className="text-xs font-normal">
                      {d.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge
                      variant={d.hospitalAffiliationStatus === "active" ? "default" : "secondary"}
                      className="text-xs font-normal capitalize"
                    >
                      {d.hospitalAffiliationStatus || "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{d.totalAppointments}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(d.totalEarned || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ListingPanel>
    </>
  );
}
