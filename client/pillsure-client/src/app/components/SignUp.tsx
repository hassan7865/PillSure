"use client";
import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Separator } from "@/components/ui/separator";

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

  const validateEmail = (email: string) => {
    return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
  };

  const validatePassword = (password: string) => {
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
  };

  const onSubmit = (values: { email: string; password: string; confirmPassword: string }) => {
    setSuccess("Sign up successful!");
  };

  const handleGoogleSignUp = () => {
    setSuccess("Google signup (OAuth) not implemented.");
  };

  const handleFacebookSignUp = () => {
    setSuccess("Facebook signup (OAuth) not implemented.");
  };

  return (
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
                validate: (value) => validateEmail(value) || "Please enter a valid email address."
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
                  <FormMessage />
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
                required: "Please confirm your password",
                validate: (value) => value === form.watch("password") || "Passwords do not match."
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
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-base font-medium hover:bg-blue-700 transition-colors"
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
                variant="outline"
                onClick={handleGoogleSignUp} 
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm rounded-md"
              >
                <Image src="/Google__G__logo.svg" alt="Google" width={16} height={16} />
                Sign up with Google
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={handleFacebookSignUp} 
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm rounded-md"
              >
                <Image src="/facebook-svgrepo-com.svg" alt="Facebook" width={16} height={16} />
                Sign up with Facebook
              </Button>
            </div>
          </CardContent>
        </form>
      </Form>
      
      <CardFooter className="p-0 pt-4 mt-4 text-center">
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <Button 
            type="button" 
            variant="link" 
            onClick={() => router.push('/auth')} 
            className="text-blue-600 p-0 h-auto font-normal"
          >
            Log in
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
};

export default SignUp;