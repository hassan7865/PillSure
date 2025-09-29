"use client";
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import LoginForm from "./components/Login";
import SignUp from "./components/SignUp";
import AuthGuard from "@/components/auth-guard";

const AuthPage: React.FC = () => {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'patient';
  const mode = searchParams.get('mode') || 'login';
  
  // Show signup form if mode=signup, otherwise show login form
  const [isLogin, setIsLogin] = useState(mode !== 'signup');

  const handleLogin = (email: string, password: string) => {
    console.log("Login:", email, password);
  };

  const handleSignUp = (email: string, password: string) => {
    console.log("SignUp:", email, password);
  };

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
            onLogin={handleLogin}
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

export default AuthPage;