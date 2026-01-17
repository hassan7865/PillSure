"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTrendingUp, IconTrendingDown, IconCalendar } from "@tabler/icons-react";
import { useCurrentDoctorYearlyStats } from '@/app/appointments/use-appointments';

const AppointmentStatsCard: React.FC<AppointmentStatsCardProps> = () => {
  const currentYear = new Date().getFullYear();
  const { data: yearlyStats, isLoading: statsLoading, error } = useCurrentDoctorYearlyStats(currentYear);

  if (statsLoading) {
    return (
      <Card className="@container/card animate-pulse">
        <CardHeader>
          <CardDescription>Monthly Appointments</CardDescription>
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
          <CardDescription>Monthly Appointments</CardDescription>
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


  // Find the current month's data from yearlyStats.monthly
  const monthly = (yearlyStats as any)?.monthly || [];
  const thisMonth = new Date().getMonth(); // 0-based
  const monthObj = monthly[thisMonth];
  const monthlyTotal = monthObj?.total || 0;
  const statusBreakdown = monthObj?.statusBreakdown || [];

  // Calculate percentage change (placeholder for now)
  const percentageChange = Math.floor(Math.random() * 20) - 10;
  const isPositive = percentageChange >= 0;

  // Get confirmed, pending, completed counts for the current month
  const confirmedCount = statusBreakdown?.find((s: any) => s.status === 'confirmed')?.count || 0;
  const pendingCount = statusBreakdown?.find((s: any) => s.status === 'pending')?.count || 0;
  const completedCount = statusBreakdown?.find((s: any) => s.status === 'completed')?.count || 0;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>Monthly Appointments</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {monthlyTotal}
        </CardTitle>
        <CardAction>
          <Badge variant="outline" className={isPositive ? "text-green-600" : "text-red-600"}>
            {isPositive ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
            {isPositive ? '+' : ''}{percentageChange}%
          </Badge>
        </CardAction>
      </CardHeader>
      <div className="px-6 pb-4">
        <div className="flex flex-col gap-1.5 text-sm">
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
      </div>
    </Card>
  );
};

export default AppointmentStatsCard;

