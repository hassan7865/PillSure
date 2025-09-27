"use client";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push('/auth');
      }
      // Note: Removed automatic redirect for authenticated users on auth pages
      // to allow AuthContext to handle onboarding redirects
    }
  }, [user, loading, requireAuth, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null; // Will redirect to auth
  }

  // Note: Removed blocking of authenticated users on auth pages
  // to allow AuthContext to handle onboarding redirects

  return <>{children}</>;
}
