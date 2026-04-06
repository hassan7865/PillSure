"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loader from "@/components/ui/loader";
import { useCurrentHospitalDashboardStats } from "@/app/appointments/use-appointments";
import { CalendarClock, CheckCircle2, Clock3, Wallet, XCircle, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { cardSectionClass, surfaceInsetClass } from "@/lib/dashboard-ui";
import { getErrorMessage } from "@/lib/error-utils";

const HospitalDashboardPage = () => {
  const { data: stats, isLoading: statsLoading, error: statsError } = useCurrentHospitalDashboardStats();

  if (statsLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader title="Loading dashboard" description="Fetching hospital stats..." />
      </div>
    );
  }

  if (statsError || !stats) {
    const message = statsError ? getErrorMessage(statsError) : "Unable to load hospital dashboard stats.";
    const isProfileMissing =
      typeof message === "string" &&
      (message.toLowerCase().includes("hospital profile not found") || message.toLowerCase().includes("not found"));

    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        {isProfileMissing ? (
          <Button asChild variant="default">
            <Link href="/onboarding/hospital">Complete hospital onboarding</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description={stats.hospitalName} icon={Building2} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={cardSectionClass()}>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Total Appointments
            </CardDescription>
            <CardTitle className="text-2xl">{stats.totalAppointments}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={cardSectionClass()}>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Pending
            </CardDescription>
            <CardTitle className="text-2xl">{stats.byStatus?.pending ?? stats.byStatus?.in_progress ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={cardSectionClass()}>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </CardDescription>
            <CardTitle className="text-2xl">{stats.byStatus?.completed || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={cardSectionClass()}>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Earned
            </CardDescription>
            <CardTitle className="text-2xl">PKR {Number(stats.totalEarned || 0).toFixed(2)}</CardTitle>
            <Badge variant="outline">Appointment revenue</Badge>
          </CardHeader>
        </Card>
      </div>

      <Card className={cardSectionClass()}>
        <CardHeader>
          <CardTitle className="text-lg">Appointment status breakdown</CardTitle>
          <CardDescription>Current hospital appointment distribution.</CardDescription>
        </CardHeader>
        <div className="grid grid-cols-1 gap-3 px-6 pb-6 sm:grid-cols-3">
          <div className={surfaceInsetClass("p-3")}>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="h-3 w-3" />
              Pending
            </p>
            <p className="text-2xl font-semibold">{stats.byStatus?.pending ?? stats.byStatus?.in_progress ?? 0}</p>
          </div>
          <div className={surfaceInsetClass("p-3")}>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </p>
            <p className="text-2xl font-semibold">{stats.byStatus?.completed || 0}</p>
          </div>
          <div className={surfaceInsetClass("p-3")}>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <XCircle className="h-3 w-3" />
              Cancelled
            </p>
            <p className="text-2xl font-semibold">{stats.byStatus?.cancelled || 0}</p>
          </div>
        </div>
      </Card>
    </>
  );
};

export default HospitalDashboardPage;
