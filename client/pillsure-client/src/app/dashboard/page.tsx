"use client";

import React from 'react';
import OverViewPage from './components/overview';
import { AreaGraph } from './components/area-graph';
import { BarGraph } from './components/bar-graph';
import { PieGraph } from './components/pie-graph';
import { RecentSales } from './components/recent-sales';

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Overview - includes cards and layout for main charts */}
        <OverViewPage />

        {/* In case we want standalone sections below the overview */}
        <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-3">
          <div className="col-span-2">
            <AreaGraph />
          </div>
          <div>
            <BarGraph />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-3">
          <div>
            <PieGraph />
          </div>
          <div className="col-span-2">
            <RecentSales />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;