"use client";

import React from "react";
import OverViewPage from "../components/overview";
import { PageHeader } from "@/components/shell/page-header";
import { LayoutDashboard } from "lucide-react";

const AdminDashboardPage = () => {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of users, providers, appointments, and medicine revenue."
        icon={LayoutDashboard}
        variant="dashboard"
      />
      <OverViewPage />
    </>
  );
};

export default AdminDashboardPage;