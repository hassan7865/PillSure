"use client";
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface LoginRequiredProps {
  children: (handleAction: () => void) => ReactNode;
  onSuccess?: () => void;
  fallback?: ReactNode;
}

export default function LoginRequired({ children, onSuccess, fallback }: LoginRequiredProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleAction = () => {
    if (!user) {
      const returnUrl = `${pathname}${window.location.search}`;
      sessionStorage.setItem('returnUrl', returnUrl);
      router.push(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
    } else {
      onSuccess?.();
    }
  };

  if (!user && fallback) {
    return <>{fallback}</>;
  }

  return <>{children(handleAction)}</>;
}

