"use client";

import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import React, { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/loader";
import { canAccessPublicArea, getDashboardHomeByRole } from "@/lib/role-routing";

/** Navbar + main + footer without role-based redirects (e.g. legal pages for all users). */
export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-16 sm:pt-20">{children}</main>
      <Footer />
    </div>
  );
}

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (!canAccessPublicArea(user.role)) {
      router.replace(getDashboardHomeByRole(user.role));
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader title="Loading" description="Preparing your experience..." />
      </div>
    );
  }

  // Prevent rendering public pages while role-based redirect is in progress.
  if (user && !canAccessPublicArea(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader title="Redirecting" description="Opening your dashboard..." />
      </div>
    );
  }

  return <PublicPageShell>{children}</PublicPageShell>;
};

export default PublicLayout;