"use client";

import React from 'react';
import OverViewPage from '../components/overview';
import { AreaGraph } from '../components/area-graph';
import { BarGraph } from '../components/bar-graph';
import { PieGraph } from '../components/pie-graph';
import { RecentSales } from '../components/recent-sales';


const AdminDashboardPage = () => {
  return (
    <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Dashboard</h1>

      {/* Overview - includes cards and layout for main charts */}
      <OverViewPage />

      {/* Charts section - all charts on separate lines */}
      <div className="space-y-6 mt-6">
        <AreaGraph />
        <BarGraph />
        <PieGraph />
        <RecentSales />
      </div>
    </div>
  );
};

export default AdminDashboardPage;