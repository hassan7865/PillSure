"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { onboardingApi } from '@/lib/onboarding-api';

interface OnboardingGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function OnboardingGuard({ children, fallback }: OnboardingGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Don't check if user is not logged in or still loading
      if (!user || loading) {
        setIsChecking(false);
        return;
      }

      try {
        // Get onboarding status from API
        const status = await onboardingApi.getOnboardingStatus();
        setIsOnboardingComplete(status.isOnboardingComplete);
        
        // If onboarding is not complete, redirect to appropriate onboarding page
        if (!status.isOnboardingComplete) {
          const role = user.role?.toLowerCase();
          
          switch (role) {
            case 'patient':
              router.push('/patient-onboarding');
              break;
            case 'doctor':
              router.push('/doctor-onboarding');
              break;
            case 'hospital':
              router.push('/hospital-onboarding');
              break;
            default:
              console.warn('Unknown user role:', role);
              break;
          }
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
        // If we can't check onboarding status, allow access
        setIsOnboardingComplete(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, router]);

  // Show loading while checking onboarding status
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Checking onboarding status...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, redirect to login
  if (!user) {
    router.push('/auth');
    return null;
  }

  // If onboarding is not complete, show fallback or redirect
  if (!isOnboardingComplete) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Default fallback - redirect to appropriate onboarding
    const role = user.role?.toLowerCase();
    switch (role) {
      case 'patient':
        router.push('/patient-onboarding');
        break;
      case 'doctor':
        router.push('/doctor-onboarding');
        break;
      case 'hospital':
        router.push('/hospital-onboarding');
        break;
    }
    return null;
  }

  // If onboarding is complete, render children
  return <>{children}</>;
}
