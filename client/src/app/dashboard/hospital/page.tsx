"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Loader from '@/components/ui/loader';
import { useCurrentHospitalDashboardStats } from '@/app/appointments/use-appointments';
import { CalendarClock, CheckCircle2, Clock3, Wallet, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const HospitalDashboardPage = () => {
  const { data: stats, isLoading, error } = useCurrentHospitalDashboardStats();

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <Loader title="Loading dashboard" description="Fetching hospital stats..." />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Unable to load hospital dashboard stats.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-4">{stats.hospitalName}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><CalendarClock className="h-4 w-4" />Total Appointments</CardDescription>
            <CardTitle className="text-2xl">{stats.totalAppointments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><Clock3 className="h-4 w-4" />Pending</CardDescription>
            <CardTitle className="text-2xl">{stats.byStatus?.pending || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Completed</CardDescription>
            <CardTitle className="text-2xl">{stats.byStatus?.completed || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><Wallet className="h-4 w-4" />Total Earned</CardDescription>
            <CardTitle className="text-2xl">PKR {Number(stats.totalEarned || 0).toFixed(2)}</CardTitle>
            <Badge variant="outline">Appointment revenue</Badge>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Appointment Status Breakdown</CardTitle>
          <CardDescription>Current hospital appointment distribution.</CardDescription>
        </CardHeader>
        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock3 className="h-3 w-3" />Pending</p>
            <p className="text-2xl font-semibold">{stats.byStatus?.pending || 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Completed</p>
            <p className="text-2xl font-semibold">{stats.byStatus?.completed || 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="h-3 w-3" />Cancelled</p>
            <p className="text-2xl font-semibold">{stats.byStatus?.cancelled || 0}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HospitalDashboardPage;