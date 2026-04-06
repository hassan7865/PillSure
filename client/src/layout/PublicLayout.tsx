"use client";

import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import React from "react";
import Loader from "@/components/ui/loader";
import { fixedNavbarOffsetPt } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { usePublicAreaGate } from "@/hooks/use-public-area-gate";
export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className={cn("flex-1", fixedNavbarOffsetPt)}>{children}</main>
      <Footer />
    </div>
  );
}

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  const { loading, redirecting } = usePublicAreaGate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader title="Loading" description="Preparing your experience..." />
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader title="Redirecting" description="Opening your dashboard..." />
      </div>
    );
  }

  return <PublicPageShell>{children}</PublicPageShell>;
};

export default PublicLayout;