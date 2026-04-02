'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/layout/app-sidebar';
import Header from '@/layout/app-header';
import { useAuth } from '@/contexts/auth-context';
import Loader from '@/components/ui/loader';
import { canAccessDashboardPath, getDashboardHomeByRole } from '@/lib/role-routing';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }

    if (!canAccessDashboardPath(user.role, pathname)) {
      router.replace(getDashboardHomeByRole(user.role));
    }
  }, [loading, pathname, router, user]);

  if (loading || !user || !canAccessDashboardPath(user.role, pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader title="Redirecting" description="Checking access..." />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-x-auto overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
