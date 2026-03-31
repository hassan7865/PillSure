"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/ui/loader';
import { useCurrentDoctorDashboardStats } from '@/app/appointments/use-appointments';
import { CalendarClock, CheckCircle2, Clock3, Wallet } from 'lucide-react';
import AppointmentYearlyTotalCard from '../components/appointment-yearly-total-card';
import AppointmentBarChart from '../components/appointment-bar-chart';

const DoctorDashboardPage = () => {
  const { data: stats, isLoading, error } = useCurrentDoctorDashboardStats();

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <Loader title="Loading dashboard" description="Fetching doctor stats..." />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Unable to load doctor dashboard stats.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Dashboard</h1>

      <p className="text-sm text-muted-foreground mb-4">
        Appointment performance and earnings overview.
      </p>

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
        {!stats.isHospitalAffiliated && (
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2"><Wallet className="h-4 w-4" />Total Earned</CardDescription>
              <CardTitle className="text-2xl">PKR {Number(stats.totalEarned || 0).toFixed(2)}</CardTitle>
              <Badge variant="outline">Appointment revenue</Badge>
            </CardHeader>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
        <div className="lg:col-span-1">
          <AppointmentYearlyTotalCard />
        </div>
        <div className="lg:col-span-4">
          <AppointmentBarChart />
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboardPage;