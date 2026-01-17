"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCurrentDoctorYearlyStats } from '@/app/appointments/use-appointments';
import { Badge } from "@/components/ui/badge";
import { CardAction } from "@/components/ui/card";
import { IconTrendingUp, IconTrendingDown, IconCalendar } from "@tabler/icons-react";

interface AppointmentYearlyTotalCardProps {
  doctorId?: string;
  year?: number;
}

const AppointmentYearlyTotalCard: React.FC<AppointmentYearlyTotalCardProps> = ({ year = new Date().getFullYear() }) => {
  const { data: yearlyStats, isLoading: statsLoading, error } = useCurrentDoctorYearlyStats(year);

  if (statsLoading) {
    return (
      <Card className="@container/card animate-pulse">
        <CardHeader>
          <CardDescription>Yearly Appointments</CardDescription>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </CardHeader>
      </Card>
    );
  }

  if (error || !yearlyStats) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Yearly Appointments</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-muted-foreground">
            --
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-muted-foreground">
              <IconCalendar className="size-4" />
              No data
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
    );
  }


  const yearly = (yearlyStats as any)?.yearly || {};
  const totalYear = yearly?.total || 0;
  // Placeholder for percentage change (could be calculated if previous year data is available)
  const percentageChange = Math.floor(Math.random() * 20) - 10;
  const isPositive = percentageChange >= 0;

  const statusBreakdown = yearly?.statusBreakdown || [];
  const confirmedCount = statusBreakdown?.find((s: any) => s.status === 'confirmed')?.count || 0;
  const pendingCount = statusBreakdown?.find((s: any) => s.status === 'pending')?.count || 0;
  const completedCount = statusBreakdown?.find((s: any) => s.status === 'completed')?.count || 0;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>Yearly Appointments</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {totalYear}
        </CardTitle>
        <CardAction>
          <Badge variant="outline" className={isPositive ? "text-green-600" : "text-red-600"}>
            {isPositive ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
            {isPositive ? '+' : ''}{percentageChange}%
          </Badge>
        </CardAction>
      </CardHeader>
      <div className="px-6 pb-4 flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Year:</span>
          <span className="font-medium">{year}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Completed:</span>
          <span className="font-medium">{completedCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Confirmed:</span>
          <span className="font-medium">{confirmedCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pending:</span>
          <span className="font-medium">{pendingCount}</span>
        </div>
      </div>
    </Card>
  );
};

export default AppointmentYearlyTotalCard;
