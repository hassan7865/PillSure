"use client";

import React, { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Pill, User, Stethoscope, Building2 } from "lucide-react";
import Loader from "@/components/ui/loader";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

const OnboardingLayoutContent: React.FC<OnboardingLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get current step from URL search params (if available)
  const currentStep = parseInt(searchParams.get('step') || '1');
  
  // Determine the current onboarding type and steps
  const getOnboardingConfig = () => {
    if (pathname.includes('/patient')) {
      return {
        title: "Patient Onboarding",
        type: "patient",
        steps: [
          { id: 1, name: "Personal Info", description: "Basic information of patient", icon: User },
          { id: 2, name: "Medical Details", description: "Patient's medical history", icon: Stethoscope },
        ]
      };
    } else if (pathname.includes('/doctor')) {
      return {
        title: "Doctor Onboarding",
        type: "doctor",
        steps: [
          { id: 1, name: "Doctor Info", description: "Basic information of doctor", icon: User },
          { id: 2, name: "Professional Details", description: "Doctor's career background", icon: Stethoscope },
        ]
      };
    } else if (pathname.includes('/hospital')) {
      return {
        title: "Hospital Onboarding",
        type: "hospital",
        steps: [
          { id: 1, name: "Hospital Info", description: "Hospital information", icon: Building2 },
          { id: 2, name: "Admin Details", description: "Admin & licensing details", icon: User },
        ]
      };
    }
    return {
      title: "Onboarding",
      type: "default",
      steps: []
    };
  };

  const config = getOnboardingConfig();

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-1/4 min-w-[280px] bg-primary text-primary-foreground p-6 flex-col">
        <div className="flex-grow">
          {/* Header */}
          <div className="flex items-center mb-6 md:mb-10">
            <Pill className="w-8 h-8 mr-2 text-primary-foreground" />
            <span className="text-2xl font-bold">PillSure</span>
          </div>
          
          {/* Navigation */}
          <nav className="space-y-4 md:space-y-6">
            {config.steps.map((step) => {
              const IconComponent = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <div 
                  key={step.id} 
                  className={`flex items-center space-x-4 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-accent text-accent-foreground shadow-md' 
                      : isCompleted
                      ? 'bg-accent/30 text-accent-foreground/80'
                      : 'hover:bg-accent/50 hover:text-accent-foreground'
                  }`}
                >
                  <div className="relative">
                    <IconComponent className="w-6 h-6" />
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${isActive ? 'font-semibold' : ''}`}>
                      {step.name}
                    </div>
                    <p className="text-xs opacity-80">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
        
        {/* Footer */}
        <div className="text-xs text-muted-foreground mt-auto">
          © All rights reserved PillSure
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full md:w-3/4 flex flex-col">
        {children}
      </div>
    </div>
  );
};

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children }) => {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader 
          title="Loading Onboarding"
          description="Setting up your onboarding experience..."
        />
      </div>
    }>
      <OnboardingLayoutContent>{children}</OnboardingLayoutContent>
    </Suspense>
  );
};

export default OnboardingLayout;
