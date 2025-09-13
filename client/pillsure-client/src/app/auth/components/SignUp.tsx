 "use client";
import React from "react";
 import { useRouter } from "next/navigation";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
 import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
 import { useForm } from "react-hook-form";
 import { Separator } from "@/components/ui/separator";

// Validation functions
const validateEmail = (email: string): boolean => {
  return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
};

const validatePassword = (password: string): boolean => {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
};

// Main App component for the signup form
interface SignUpFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

const SignUp: React.FC = () => {
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [success, setSuccess] = React.useState<string>("");

  const onSubmit = (values: SignUpFormValues) => {
    setSuccess("Signup successful!");
    console.log("Signed up with:", values);
  };

  const { errors } = form.formState;

  return (
    <div className="flex w-full flex-col md:flex-row h-screen font-sans">
      {/* Left panel - Themed section */}
      <div className="hidden md:flex flex-col items-center justify-center md:w-100 p-8 bg-[#1a237e] text-white">
        <div className="flex items-center mb-4">
          {/* Heart icon */}
          <svg className="h-8 w-8 text-white mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5A5.5 5.5 0 017.5 3c1.74 0 3.41.81 4.5 2.09A5.5 5.5 0 0116.5 3c3.03 0 5.5 2.47 5.5 5.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span className="text-xl font-bold">Pillsure</span>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-center">Welcome to Pillsure </h1>
        <p className="text-center text-lg max-w-sm">Your all-in-one solution for medication management and healthcare needs.</p>
        <div className="mt-8 flex justify-center items-center">
          <style>
            {`
              @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-15px); }
                100% { transform: translateY(0px); }
              }
              .floating-icon {
                animation: float 3s ease-in-out infinite;
              }
            `}
          </style>
          {/* A simple SVG to represent the floating 3D cube */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-28 w-28 text-white floating-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L5 7v10l7 5 7-5V7l-7-5z" />
            <path d="M12 10.5L18 7" />
            <path d="M12 10.5L6 7" />
            <path d="M12 10.5V17" />
            <path d="M12 17L18 14" />
            <path d="M12 17L6 14" />
          </svg>
        </div>
        <div className="mt-auto text-center text-sm opacity-80">
          All rights reserved © Pillsure
        </div>
      </div>

      {/* Right panel with the form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gray-100 ">
        <Card className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
          <CardHeader className="space-y-2 p-0 mb-6">
            <CardTitle className="text-xl font-semibold text-blue-900">Sign Up</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Create your account to continue
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <CardContent className="p-0 space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  rules={{
                    required: "Email is required",
                    validate: (value: string) => validateEmail(value) || "Please enter a valid email address."
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-700">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Email"
                          {...field}
                          className="w-full px-3 py-2 rounded-md text-sm"
                        />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  rules={{
                    required: "Password is required",
                    validate: (value: string) => validatePassword(value) || "Password must be at least 8 characters and contain a letter and a number."
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-700">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Password"
                          {...field}
                          className="w-full px-3 py-2 rounded-md text-sm"
                        />
                      </FormControl>
                      <FormMessage />
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
                      <FormLabel className="text-sm text-gray-700">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm Password"
                          {...field}
                          className="w-full px-3 py-2 rounded-md text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="default"
                  className="w-full text-white py-2 px-4 rounded-md text-base font-medium transition-colors"
                >
                  Sign Up
                </Button>

                {success && (
                  <div className="text-sm text-green-500 bg-green-50 p-2 rounded-md">
                    {success}
                  </div>
                )}

                <div className="relative my-4">
                  <Separator />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white px-2 text-xs text-gray-500">or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm rounded-md"
                  >
                    {/* Google Logo SVG */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 48 48">
                      <defs>
                        <path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.2-6.2C34.3 4.1 29.5 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                      </defs>
                      <clipPath id="b"><use overflow="visible" xlinkHref="#a"/></clipPath>
                      <path clipPath="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z"/>
                      <path clipPath="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14.9V0H0z"/>
                      <path clipPath="url(#b)" fill="#34A853" d="M0 37l30-23 7.9 1.3L48 0v48H0z">
                        <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="2s" repeatCount="indefinite" />
                      </path>
                      <path clipPath="url(#b)" fill="#4285F4" d="M48 14.9L30 37l-6.1-7.1L48 24z"/>
                    </svg>
                    Sign Up with Google
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm rounded-md"
                  >
                    {/* Facebook Logo SVG */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="#4285F4">
                      <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm3 8h-1.35c-.5 0-.65.23-.65.71v1.17h2l-.25 2h-1.75v6h-3v-6h-2v-2h2v-2.19c0-1.785.922-2.791 2.973-2.791h1.797v3z"/>
                    </svg>
                    Sign Up with Facebook
                  </Button>
                </div>
              </CardContent>
            </form>
          </Form>

          <CardFooter className="p-0 pt-4 mt-4 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Button
                type="button"
                variant="link"
                onClick={() => router.push("?page=login")}
                className="text-blue-600 p-0 h-auto font-normal"
              >
                Log in
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
