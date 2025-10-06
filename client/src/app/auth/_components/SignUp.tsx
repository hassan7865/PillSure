"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { Pill, Mail, Lock } from "lucide-react";
import { useSignup, useGoogleSignup } from "@/app/auth/hooks/use-auth";
import { getErrorMessage } from "@/lib/error-utils";
import { SignUpFormValues, SignUpProps } from "./_types";

// Validation functions
const validateEmail = (email: string): boolean => {
  return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
};

const validatePassword = (password: string): boolean => {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
};

// Main App component for the signup form

const SignUp: React.FC<SignUpProps> = ({ onSwitchToLogin, role = 'patient' }) => {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const signupMutation = useSignup();
  const googleSignupMutation = useGoogleSignup();

  const [success, setSuccess] = React.useState<string>("");

  // Note: Removed redirect logic to let AuthContext handle onboarding redirects

  const onSubmit = async (values: SignUpFormValues) => {
    try {
      await signupMutation.mutateAsync({ 
        email: values.email, 
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        role: role
      });
      setSuccess("Signup successful!");
      // AuthContext will handle the redirect to onboarding
    } catch (error) {
      console.error('Signup error:', error);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await googleSignupMutation.mutateAsync({ role });
      // AuthContext will handle the redirect to onboarding
    } catch (error) {
      console.error('Google signup error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Desktop Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Brand Panel - Hidden on Mobile */}
    {/* Left Brand Panel - Hidden on Mobile */}
    <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary via-primary/95 to-accent relative overflow-hidden">
          {/* Enhanced background pattern */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/15 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute top-1/3 right-16 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-white/8 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-20 h-20 bg-white/12 rounded-full blur-lg"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between h-full p-10 lg:p-12">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Pillsure</h1>
              <div className="w-12 h-1 bg-white/30 rounded-full"></div>
            </div>

            {/* Main content - centered */}
            <div className="flex-1 flex flex-col justify-center items-center py-8">
              <div className="text-center max-w-md">
                {/* Icon with enhanced styling */}
                <div className="relative mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
                    <Pill className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white/20 rounded-full animate-ping"></div>
                </div>

                <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                  Join Pillsure
                </h2>
                <p className="text-lg text-white/90 leading-relaxed">
                  Create your account to start managing your healthcare journey with confidence.
                </p>
              </div>
            </div>

            {/* Feature highlights and footer */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-white/80">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  <span className="text-sm">Smart medication reminders</span>
                </div>
                <div className="flex items-center space-x-3 text-white/80">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  <span className="text-sm">Health tracking & insights</span>
                </div>
                <div className="flex items-center space-x-3 text-white/80">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  <span className="text-sm">Secure & private data</span>
                </div>
              </div>
              
              {/* Footer */}
              <div>
                <p className="text-xs text-white/50">© 2024 Pillsure. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 md:w-1/2 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-sm">
            <Card className="bg-card border border-border rounded-xl shadow-lg md:shadow-2xl">
              {/* Card Header */}
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-xl md:text-2xl font-bold text-card-foreground mb-2 text-left">
                  Sign Up
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm text-left">
                  Create your account to continue
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
                          <FormLabel className="text-sm font-medium text-card-foreground">
                            Email
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Enter your email"
                                {...field}
                                className="w-full pl-10 pr-4 py-3 border border-input rounded-lg text-sm focus:border-ring focus:ring-2 focus:ring-ring/10 transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-destructive text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="firstName"
                        rules={{
                          required: "First name is required",
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-card-foreground">
                              First Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="First name"
                                {...field}
                                className="w-full px-3 py-3 border border-input rounded-lg text-sm focus:border-ring focus:ring-2 focus:ring-ring/10 transition-colors"
                              />
                            </FormControl>
                            <FormMessage className="text-destructive text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        rules={{
                          required: "Last name is required",
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-card-foreground">
                              Last Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Last name"
                                {...field}
                                className="w-full px-3 py-3 border border-input rounded-lg text-sm focus:border-ring focus:ring-2 focus:ring-ring/10 transition-colors"
                              />
                            </FormControl>
                            <FormMessage className="text-destructive text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="password"
                      rules={{
                        required: "Password is required",
                        validate: (value: string) => validatePassword(value) || "Password must be at least 8 characters and contain a letter and a number."
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-card-foreground">
                            Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="password"
                                placeholder="Enter your password"
                                {...field}
                                className="w-full pl-10 pr-4 py-3 border border-input rounded-lg text-sm focus:border-ring focus:ring-2 focus:ring-ring/10 transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-destructive text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      rules={{
                        required: "Confirm Password is required",
                        validate: (value: string) => value === form.getValues("password") || "Passwords do not match."
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-card-foreground">
                            Confirm Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="password"
                                placeholder="Confirm your password"
                                {...field}
                                className="w-full pl-10 pr-4 py-3 border border-input rounded-lg text-sm focus:border-ring focus:ring-2 focus:ring-ring/10 transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-destructive text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-4 rounded-lg text-sm font-medium transition-colors"
                        disabled={signupMutation.isPending}
                      >
                        {signupMutation.isPending ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Creating account...
                          </div>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </div>

                    {success && (
                      <div className="text-sm text-green-600 bg-green-50 border border-green-200 p-3 rounded-lg">
                        {success}
                      </div>
                    )}

                    {(signupMutation.error || googleSignupMutation.error) && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                        {getErrorMessage(signupMutation.error) || getErrorMessage(googleSignupMutation.error)}
                      </div>
                    )}

                    <div className="relative my-4">
                      <Separator className="bg-border" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-card px-3 text-xs text-muted-foreground">or</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-input rounded-lg hover:bg-accent text-foreground text-sm transition-colors"
                      onClick={handleGoogleSignup}
                      disabled={googleSignupMutation.isPending}
                    >
                      {googleSignupMutation.isPending ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2"></div>
                          Creating account...
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
              <CardFooter className="px-6 py-4 bg-muted/50 rounded-b-xl">
                <p className="text-sm text-muted-foreground text-center w-full">
                  Already have an account?{" "}
                  <Button
                    type="button"
                    variant="link"
                    onClick={onSwitchToLogin}
                    className="text-primary hover:text-primary/80 p-0 h-auto font-medium text-sm"
                  >
                    Sign in
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

export default SignUp;