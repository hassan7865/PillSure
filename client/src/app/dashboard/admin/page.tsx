"use client";

import React from 'react';
import OverViewPage from '../components/overview';

const AdminDashboardPage = () => {
  return (
    <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      <OverViewPage />
    </div>
  );
};

export default AdminDashboardPage;