"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Loader from "@/components/ui/loader";

interface OnboardingPageProps {
  step: number;
  maxSteps: number;
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  canGoNext?: boolean;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({
  step,
  maxSteps,
  title,
  children,
  onBack,
  onNext,
  onSubmit,
  isSubmitting = false,
  canGoNext = true
}) => {
  const pathname = usePathname();
  
  // Get step labels based on onboarding type
  const getStepLabels = () => {
    if (pathname.includes('/patient')) {
      return ["Personal Info", "Medical Details"];
    } else if (pathname.includes('/doctor')) {
      return ["Doctor Info", "Professional Details"];
    } else if (pathname.includes('/hospital')) {
      return ["Hospital Info", "Admin Details"];
    }
    return ["Step 1", "Step 2"];
  };

  const stepLabels = getStepLabels();

  // Button handlers
  const handleBack = React.useCallback(() => {
    onBack?.();
  }, [onBack]);

  const handleNext = React.useCallback(() => {
    onNext?.();
  }, [onNext]);

  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <Loader 
          title="Loading Onboarding"
          description="Please wait while we prepare your onboarding experience..."
        />
      </div>
    }>
      {/* Scrollable Content */}
      <div className="flex-1 p-4 md:p-6">
        <div className="w-full max-w-3xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              <div className="text-xs text-muted-foreground">
                Step {step} of {maxSteps}
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(step / maxSteps) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              {stepLabels.map((label, index) => (
                <span 
                  key={index}
                  className={step >= index + 1 ? "text-primary font-medium" : ""}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4 pr-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Fixed Button Area */}
      <div className="border-t bg-background p-4 md:p-6">
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex gap-4">
            {step > 1 && onBack && (
              <Button 
                type="button" 
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-9"
              >
                <span className="flex items-center gap-1 text-sm">
                  ← Back
                </span>
              </Button>
            )}
            
            {step < maxSteps && onNext && (
              <Button 
                type="button" 
                variant="default"
                onClick={handleNext}
                disabled={!canGoNext}
                className="flex-1 h-9"
              >
                <span className="flex items-center gap-1 text-sm">
                  Next →
                </span>
              </Button>
            )}
            
            {step === maxSteps && onSubmit && (
              <Button
                type="button"
                variant="default"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="flex-1 h-9"
              >
                <span className="flex items-center gap-1 text-sm">
                  {isSubmitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      ✓ Complete Registration
                    </>
                  )}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Suspense>
  );
};

export default OnboardingPage;
