"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm, FieldErrors } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { Pill, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useLogin, useGoogleLogin } from "@/hooks/use-auth";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/error-utils";
import { LoginFormProps } from "@/lib/types";

const validateEmail = (email: string): boolean => {
  return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
};

const validatePassword = (password: string) => {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
};

// Main App component for the login form

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSwitchToSignUp }) => {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const loginMutation = useLogin();
  const googleLoginMutation = useGoogleLogin();

  const [success, setSuccess] = React.useState<string>("");

  // Note: Removed redirect logic to let AuthContext handle onboarding redirects

  const onSubmit = async (values: { email: string; password: string }) => {
    try {
      await loginMutation.mutateAsync({ email: values.email, password: values.password });
      setSuccess("Login successful!");
      // AuthContext will handle the redirect to onboarding
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLoginMutation.mutateAsync();
      // AuthContext will handle the redirect to onboarding
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        .floating-icon {
          animation: float 2s ease-in-out infinite;
        }
      `}</style>

      {/* Desktop Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Brand Panel - Hidden on Mobile */}
        <div className="hidden md:flex md:w-1/2 bg-[#1a237e] relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-20 right-10 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center p-8 text-white">
            {/* Logo and brand */}
            <div className="flex items-center mb-8">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 mr-4">
                <Image 
                  src="/logo.png" 
                  alt="Pillsure Logo" 
                  width={40} 
                  height={40} 
                  className="rounded-full"
                />
              </div>
              <span className="text-3xl font-bold">Pillsure</span>
            </div>

            {/* Main content */}
            <div className="text-center max-w-lg">
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Welcome Back
              </h1>
              <p className="text-lg text-blue-100 mb-12 leading-relaxed">
                Your trusted companion for medication management and healthcare wellness.
              </p>

              {/* Floating icon */}
              <div className="flex justify-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-6">
                  <Pill className="h-16 w-16 text-white floating-icon" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-center">
              <p className="text-blue-200 text-sm">© 2024 Pillsure. All rights reserved.</p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 md:w-1/2 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-sm">
            <Card className="bg-white border border-gray-200 rounded-xl shadow-lg md:shadow-2xl">
              {/* Card Header */}
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 mb-2 text-left">
                  Sign In
                </CardTitle>
                <CardDescription className="text-gray-600 text-sm text-left">
                  Enter your credentials to continue
                </CardDescription>
              </CardHeader>

              {/* Card Content */}
              <CardContent className="p-6 pt-2">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      rules={{
                        required: "Email is required",
                        validate: (value: string) => validateEmail(value) || "Please enter a valid email address."
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <Label className="text-sm font-medium text-gray-700">
                            Email
                          </Label>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Enter your email"
                                {...field}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:border-[#1a237e] focus:ring-2 focus:ring-[#1a237e]/10 transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-500 text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      rules={{
                        required: "Password is required",
                        validate: (value) => validatePassword(value) || "Password must be at least 8 characters and contain a letter and a number."
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <Label className="text-sm font-medium text-gray-700">
                            Password
                          </Label>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                type="password"
                                placeholder="Enter your password"
                                {...field}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:border-[#1a237e] focus:ring-2 focus:ring-[#1a237e]/10 transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-500 text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2">
                      <Button 
                        type="submit"
                        className="w-full bg-[#1a237e] hover:bg-[#283593] text-white py-3 px-4 rounded-lg text-sm font-medium transition-colors"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Signing in...
                          </div>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </div>
                    
                    {success && (
                      <div className="text-sm text-green-600 bg-green-50 border border-green-200 p-3 rounded-lg">
                        {success}
                      </div>
                    )}

                    {(loginMutation.error || googleLoginMutation.error) && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                        {getErrorMessage(loginMutation.error) || getErrorMessage(googleLoginMutation.error)}
                      </div>
                    )}

                    <div className="relative my-4">
                      <Separator className="bg-gray-200" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-white px-3 text-xs text-gray-500">or</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm transition-colors"
                      onClick={handleGoogleLogin}
                      disabled={googleLoginMutation.isPending}
                    >
                      {googleLoginMutation.isPending ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2"></div>
                          Signing in...
                        </div>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Continue with Google
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>

              {/* Card Footer */}
              <CardFooter className="px-6 py-4 bg-gray-50 rounded-b-xl">
                <p className="text-sm text-gray-600 text-center w-full">
                  Don't have an account?{" "}
                  <Button
                    type="button"
                    variant="link"
                    onClick={onSwitchToSignUp}
                    className="text-[#1a237e] hover:text-[#283593] p-0 h-auto font-medium text-sm"
                  >
                    Sign up
                  </Button>
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;