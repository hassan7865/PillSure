"use client";
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface LoginRequiredProps {
  children: (handleAction: () => void) => ReactNode;
  onSuccess?: () => void;
  fallback?: ReactNode;
  requirePatient?: boolean; // If true, only patients can access
}

export default function LoginRequired({ 
  children, 
  onSuccess, 
  fallback,
  requirePatient = false 
}: LoginRequiredProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleAction = () => {
    if (!user) {
      const returnUrl = `${pathname}${window.location.search}`;
      sessionStorage.setItem('returnUrl', returnUrl);
      if (requirePatient) {
        sessionStorage.setItem('requirePatient', 'true');
      }
      router.push(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Check if patient role is required
    if (requirePatient) {
      const userRole = user.role?.toLowerCase() || '';
      if (userRole !== 'patient') {
        const returnUrl = `${pathname}${window.location.search}`;
        sessionStorage.setItem('returnUrl', returnUrl);
        sessionStorage.setItem('requirePatient', 'true');
        router.push(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }
    }

    // User is logged in and has required role
    onSuccess?.();
  };

  if (!user && fallback) {
    return <>{fallback}</>;
  }

  return <>{children(handleAction)}</>;
}

