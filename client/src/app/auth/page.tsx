"use client";
import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "./_components/Login";
import SignUp from "./_components/SignUp";
import AuthGuard from "@/components/auth-guard";
import Loader from "@/components/ui/loader";

const AuthPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "patient";
  const mode = searchParams.get("mode") || "login";
  const returnUrl = searchParams.get("returnUrl");
  const isLogin = mode !== "signup";

  useEffect(() => {
    if (returnUrl) {
      sessionStorage.setItem("returnUrl", returnUrl);
    }
  }, [returnUrl]);

  const handleSwitchToSignUp = () => {
    const sp = new URLSearchParams();
    if (returnUrl) sp.set("returnUrl", returnUrl);
    sp.set("mode", "signup");
    router.replace(`/auth?${sp.toString()}`, { scroll: false });
  };

  const handleSwitchToLogin = () => {
    const sp = new URLSearchParams();
    if (returnUrl) sp.set("returnUrl", returnUrl);
    const q = sp.toString();
    router.replace(q ? `/auth?${q}` : "/auth", { scroll: false });
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-background">
        {isLogin ? (
          <LoginForm
            onSwitchToSignUp={handleSwitchToSignUp}
          />
        ) : (
          <SignUp
            onSwitchToLogin={handleSwitchToLogin}
            role={role}
          />
        )}
      </div>
    </AuthGuard>
  );
};

const AuthPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader 
          title="Loading Authentication"
          description="Setting up your login experience..."
        />
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
};

export default AuthPage;