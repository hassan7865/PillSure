"use client";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LoginForm from "./components/Login";
import SignUp from "./components/SignUp";


const AuthPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL-driven view: /auth?page=login or /auth?page=signup
  const view = (searchParams.get("page") as "login" | "signup") || "login";

  const handleLogin = (email: string, password: string) => {
    console.log("Login:", email, password);
  };

  const handleSignUp = (email: string, password: string) => {
    console.log("SignUp:", email, password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {view === "login" ? (
        <LoginForm
          onLogin={handleLogin}
          onSwitchToSignUp={() => router.push("?page=signup")}
        />
      ) : (
        <SignUp />
      )}
    </div>
  );
};

export default AuthPage;