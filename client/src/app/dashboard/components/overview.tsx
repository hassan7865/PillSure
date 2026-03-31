"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/app/dashboard/admin/_components/_api";
import { AdminMonthlyRevenue, AdminStats } from "@/app/dashboard/admin/_components/_types";
import Loader from "@/components/ui/loader";
import { Users, Stethoscope, Building2, CalendarClock, Package } from "lucide-react";
import AdminStatsCard from "./admin-stats-card";
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OverViewPage() {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - i);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [monthlyRevenue, setMonthlyRevenue] = useState<AdminMonthlyRevenue | null>(null);
  const [monthlyRevenueLoading, setMonthlyRevenueLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await adminApi.getStats();
        if (isMounted) {
          setStats(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch admin stats'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchRevenue = async () => {
      try {
        setMonthlyRevenueLoading(true);
        const result = await adminApi.getMonthlyRevenue(selectedYear);
        if (isMounted) {
          setMonthlyRevenue(result);
        }
      } catch {
        if (isMounted) {
          setMonthlyRevenue(null);
        }
      } finally {
        if (isMounted) {
          setMonthlyRevenueLoading(false);
        }
      }
    };

    fetchRevenue();
    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col space-y-2">
        <div className="flex items-center justify-center h-full">
          <Loader
            title="Loading Dashboard"
            description="Fetching admin statistics..."
          />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-1 flex-col space-y-2">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-2">Failed to load statistics</p>
            <p className="text-sm text-muted-foreground">{error?.message || "Unknown error"}</p>
          </div>
        </div>
      </div>
    );
  }

  const orderStatusData = Object.entries(stats.orders.byStatus || {}).map(([status, value]) => ({
    name: status,
    value: Number(value || 0),
  }));

  const appointmentStatusData = Object.entries(stats.appointments.byStatus || {}).map(([status, value]) => ({
    name: status,
    value: Number(value || 0),
  }));

  const STATUS_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--primary)",
  ];
  const orderChartConfig = {
    value: { label: "Orders" },
  } satisfies ChartConfig;
  const appointmentChartConfig = {
    value: { label: "Appointments" },
  } satisfies ChartConfig;
  const revenueChartConfig = {
    revenue: { label: "Revenue", color: "var(--primary)" },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-1 flex-col space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardDescription>
            <CardTitle className="text-2xl">{stats.users.total.toLocaleString()}</CardTitle>
            <Badge variant="outline">{stats.users.active} active</Badge>
          </CardHeader>
        </Card>

        <AdminStatsCard stats={stats} isLoading={false} />

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Orders
            </CardDescription>
            <CardTitle className="text-2xl">{stats.orders.total.toLocaleString()}</CardTitle>
            <Badge variant="outline">{stats.orders.byStatus.pending || 0} pending</Badge>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Paid Revenue (Medicines)
            </CardDescription>
            <CardTitle className="text-2xl">PKR {Number(stats.orders.paidRevenue || 0).toFixed(2)}</CardTitle>
            <Badge variant="outline">{stats.orders.byStatus.delivered || 0} delivered</Badge>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Doctors
            </CardDescription>
            <CardTitle className="text-2xl">{stats.doctors.total.toLocaleString()}</CardTitle>
            <Badge variant="outline">{stats.doctors.active} active</Badge>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Hospitals
            </CardDescription>
            <CardTitle className="text-2xl">{stats.hospitals.total.toLocaleString()}</CardTitle>
            <Badge variant="outline">{stats.hospitals.active} active</Badge>
          </CardHeader>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Appointments
            </CardDescription>
            <CardTitle className="text-2xl">{stats.appointments.total.toLocaleString()}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">Pending: {stats.appointments.byStatus?.pending || 0}</Badge>
              <Badge variant="outline">Completed: {stats.appointments.byStatus?.completed || 0}</Badge>
              <Badge variant="outline">Cancelled: {stats.appointments.byStatus?.cancelled || 0}</Badge>
            </div>
          </CardHeader>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 lg:px-6 pt-2">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Status Distribution
            </CardDescription>
            <CardTitle className="text-xl">Orders by Status</CardTitle>
          </CardHeader>
          <div className="h-[280px] px-2 pb-4">
            {orderStatusData.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4">No order status data available.</p>
            ) : (
              <ChartContainer config={orderChartConfig} className="h-full w-full">
                <PieChart>
                  <Pie data={orderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`order-cell-${entry.name}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Appointment Status Distribution
            </CardDescription>
            <CardTitle className="text-xl">Appointments by Status</CardTitle>
          </CardHeader>
          <div className="h-[280px] px-2 pb-4">
            {appointmentStatusData.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4">No appointment status data available.</p>
            ) : (
              <ChartContainer config={appointmentChartConfig} className="h-full w-full">
                <BarChart data={appointmentStatusData} margin={{ left: 8, right: 8 }}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {appointmentStatusData.map((entry, index) => (
                      <Cell key={`appointment-cell-${entry.name}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </Card>
      </div>
      <div className="px-4 lg:px-6 pt-2">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardDescription className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Monthly Paid Revenue (Medicines)
              </CardDescription>
              <CardTitle className="text-xl">
                PKR {Number(monthlyRevenue?.totalRevenue || 0).toFixed(2)}
              </CardTitle>
            </div>
            <div className="w-full sm:w-[180px]">
              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <div className="h-[320px] px-2 pb-4">
            {monthlyRevenueLoading ? (
              <p className="text-sm text-muted-foreground px-4">Loading monthly revenue...</p>
            ) : !monthlyRevenue?.revenueByMonth?.length ? (
              <p className="text-sm text-muted-foreground px-4">No revenue data available for selected year.</p>
            ) : (
              <ChartContainer config={revenueChartConfig} className="h-full w-full">
                <BarChart data={monthlyRevenue.revenueByMonth} margin={{ left: 8, right: 8 }}>
                  <XAxis dataKey="label" />
                  <YAxis
                    allowDecimals={false}
                    tickFormatter={(value) => `${Number(value).toLocaleString()}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`PKR ${Number(value).toFixed(2)}`, "Revenue"]}
                      />
                    }
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
