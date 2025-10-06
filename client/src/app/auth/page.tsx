"use client";
import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LoginForm from "./_components/Login";
import SignUp from "./_components/SignUp";
import AuthGuard from "@/components/auth-guard";
import Loader from "@/components/ui/loader";

const AuthPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'patient';
  const mode = searchParams.get('mode') || 'login';
  
  // Show signup form if mode=signup, otherwise show login form
  const [isLogin, setIsLogin] = useState(mode !== 'signup');

  const handleSwitchToSignUp = () => {
    setIsLogin(false);
  };

  const handleSwitchToLogin = () => {
    setIsLogin(true);
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