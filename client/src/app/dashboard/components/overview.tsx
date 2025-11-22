"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaGraph } from "./area-graph";
import { BarGraph } from "./bar-graph";
import { PieGraph } from "./pie-graph";
import { RecentSales } from "./recent-sales";
import { IconTrendingUp } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/app/dashboard/admin/_components/_api";
import { AdminStats } from "@/app/dashboard/admin/_components/_types";
import Loader from "@/components/ui/loader";
import { Users, Pill, Stethoscope, Building2, CalendarClock } from "lucide-react";
import AppointmentBarChart from "./appointment-bar-chart";

export default function OverViewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
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

  return (
    <div className="flex flex-1 flex-col space-y-2">
     
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6">
            {/* Total Revenue - Keep as is since not implemented yet */}
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Total Revenue</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  $1,250.00
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingUp />
                    +12.5%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  Trending up this month <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  Visitors for the last 6 months
                </div>
              </CardFooter>
            </Card>

            {/* Total Users */}
            <Card className="@container/card">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Users
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {stats.users.total.toLocaleString()}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingUp />
                    {stats.users.active} active
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {stats.users.active} active users <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  {stats.users.total - stats.users.active} inactive
                </div>
              </CardFooter>
            </Card>

            {/* Total Medicines */}
            <Card className="@container/card">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Total Medicines
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {stats.medicines.total.toLocaleString()}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingUp />
                    {stats.medicines.inStock} in stock
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {stats.medicines.inStock} medicines available <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  {stats.medicines.total - stats.medicines.inStock} out of stock
                </div>
              </CardFooter>
            </Card>

            {/* Total Doctors */}
            <Card className="@container/card">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Total Doctors
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {stats.doctors.total.toLocaleString()}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingUp />
                    {stats.doctors.active} active
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {stats.doctors.active} active doctors <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  {stats.doctors.total - stats.doctors.active} inactive
                </div>
              </CardFooter>
            </Card>

            {/* Total Hospitals */}
            <Card className="@container/card">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Total Hospitals
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {stats.hospitals.total.toLocaleString()}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingUp />
                    {stats.hospitals.active} active
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {stats.hospitals.active} active hospitals <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  {stats.hospitals.total - stats.hospitals.active} inactive
                </div>
              </CardFooter>
            </Card>

            {/* Total Appointments */}
            <Card className="@container/card">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Total Appointments
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {stats.appointments.total.toLocaleString()}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingUp />
                    {stats.appointments.byStatus?.pending || 0} pending
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {stats.appointments.byStatus?.completed || 0} completed <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  {stats.appointments.byStatus?.pending || 0} pending, {stats.appointments.byStatus?.cancelled || 0} cancelled
                </div>
              </CardFooter>
            </Card>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
            <AppointmentBarChart />
            <Card className="col-span-4 md:col-span-3">
              <RecentSales />
            </Card>
            <div className="col-span-4">
              <AreaGraph />
            </div>
            <div className="col-span-4 md:col-span-3">
              <PieGraph />
            </div>
          </div>
    </div>
  );
}
