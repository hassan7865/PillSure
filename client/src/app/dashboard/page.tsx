"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import Loader from "@/components/ui/loader";
import { getDashboardHomeByRole } from "@/lib/role-routing";

export default function DashboardEntryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    router.replace(getDashboardHomeByRole(user.role));
  }, [loading, router, user]);

  return (
    <div className="p-6">
      <Loader title="Opening dashboard" description="Redirecting to your dashboard..." />
    </div>
  );
}
