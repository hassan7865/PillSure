"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/ui/loader";
import { useCurrentDoctorDashboardStats } from "@/app/appointments/use-appointments";
import { CalendarClock, CheckCircle2, Clock3, LayoutDashboard, Wallet } from "lucide-react";
import AppointmentYearlyTotalCard from "../components/appointment-yearly-total-card";
import AppointmentBarChart from "../components/appointment-bar-chart";
import { PageHeader } from "@/components/shell/page-header";
import { cardSectionClass } from "@/lib/dashboard-ui";

const DoctorDashboardPage = () => {
  const { data: stats, isLoading, error } = useCurrentDoctorDashboardStats();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader title="Loading dashboard" description="Fetching doctor stats..." />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Unable to load doctor dashboard stats.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Appointment performance and earnings overview."
        icon={LayoutDashboard}
      />

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
            <CardTitle className="text-2xl">{stats.byStatus?.in_progress || 0}</CardTitle>
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
        {!stats.isHospitalAffiliated && (
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
        )}
      </div>

      <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <AppointmentYearlyTotalCard />
        </div>
        <div className="lg:col-span-4">
          <AppointmentBarChart />
        </div>
      </div>
    </>
  );
};

export default DoctorDashboardPage;
