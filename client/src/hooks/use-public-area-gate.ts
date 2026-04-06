"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { canAccessPublicArea, getDashboardHomeByRole } from "@/lib/role-routing";
export function usePublicAreaGate() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (!canAccessPublicArea(user.role)) {
      router.replace(getDashboardHomeByRole(user.role));
    }
  }, [user, loading, router]);

  const redirecting = Boolean(user && !canAccessPublicArea(user.role));

  return { loading, redirecting };
}
