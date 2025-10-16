"use client";

import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconCalendar, IconTrendingUp } from "@tabler/icons-react";
import { useDoctorYearlyStats } from '@/app/appointments/use-appointments';
import { useCurrentDoctor } from '@/hooks/use-doctor';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

interface AppointmentBarChartProps {
  doctorId?: string;
  year?: number;
}

export const AppointmentBarChart: React.FC<AppointmentBarChartProps> = ({ 
  doctorId, 
  year = new Date().getFullYear() 
}) => {
  const { data: currentDoctor, isLoading: doctorLoading } = useCurrentDoctor();
  
  // Use doctorId from props or try to get from current doctor
  const currentDoctorId = doctorId || currentDoctor?.id;
  
  const { data: yearlyStats, isLoading: statsLoading, error } = useDoctorYearlyStats(
    currentDoctorId || '', 
    year
  );
  
  const isLoading = doctorLoading || statsLoading;

  if (isLoading) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Monthly Appointments Overview</CardTitle>
          <CardDescription>Appointment counts throughout the year</CardDescription>
        </CardHeader>
        <div className="p-6 h-80">
          <div className="animate-pulse flex space-x-4 h-full">
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-gray-200 rounded"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded col-span-1"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !yearlyStats || !currentDoctorId) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Monthly Appointments Overview</CardTitle>
          <CardDescription>Appointment counts throughout the year</CardDescription>
        </CardHeader>
        <div className="p-6 h-80 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <IconCalendar className="size-12 mx-auto mb-4 opacity-50" />
            <p>No appointment data available</p>
            <p className="text-sm">Complete your doctor profile to view statistics</p>
          </div>
        </div>
      </Card>
    );
  }

  const { monthly = [], yearly = {} } = yearlyStats as any;
  const maxCount = Math.max(...monthly.map((d: any) => d.total));

  return (
    <Card className="col-span-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Monthly Appointments Trend</CardTitle>
            <CardDescription>
              Appointment counts for {year} • Total: {yearly.total ?? 0} appointments
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-blue-600">
              <IconTrendingUp className="size-4 mr-1" />
              Peak: {maxCount}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <div className="p-6 pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={monthly}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.7}/>
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              className="text-sm font-medium text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              className="text-sm font-medium text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      boxShadow: '0 2px 8px #0001',
                      padding: 12,
                      minWidth: 120
                    }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{label} {year}</div>
                      <div style={{ color: '#a78bfa', fontWeight: 600, fontSize: 18 }}>
                        Appointments: {payload[0].payload.total}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'rgba(167,139,250,0.08)' }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#a78bfa"
              strokeWidth={3}
              fill="url(#areaGradient)"
              dot={{ r: 4, stroke: '#a78bfa', strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6 }}
              name="Appointments"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default AppointmentBarChart;