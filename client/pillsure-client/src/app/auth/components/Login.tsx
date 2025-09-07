"use client";
import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Separator } from "@/components/ui/separator";

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  onSwitchToSignUp: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSwitchToSignUp }) => {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [success, setSuccess] = React.useState<string>("");

  const validateEmail = (email: string) => {
    return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
  };

  const validatePassword = (password: string) => {
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
  };

  const onSubmit = (values: { email: string; password: string }) => {
    setSuccess("Login successful!");
    onLogin(values.email, values.password);
  };

  const handleGoogleLogin = () => {
    setSuccess("Google login (OAuth) not implemented.");
  };

  const handleFacebookLogin = () => {
    setSuccess("Facebook login (OAuth) not implemented.");
  };

  return (
    <Card className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
      <CardHeader className="space-y-2 p-0 mb-6">
        <CardTitle className="text-xl font-semibold text-blue-900">Sign In</CardTitle>
        <CardDescription className="text-sm text-gray-600">
          Enter your credentials to continue
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
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-base font-medium hover:bg-blue-700 transition-colors"
            >
              Log in
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
                onClick={handleGoogleLogin} 
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm rounded-md"
              >
                <Image src="/Google__G__logo.svg" alt="Google" width={16} height={16} />
                Log in with Google
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={handleFacebookLogin} 
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm rounded-md"
              >
                <Image src="/facebook-svgrepo-com.svg" alt="Facebook" width={16} height={16} />
                Log in with Facebook
              </Button>
            </div>
          </CardContent>
        </form>
      </Form>
      
      <CardFooter className="p-0 pt-4 mt-4 text-center">
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Button 
            type="button" 
            variant="link" 
            onClick={onSwitchToSignUp} 
            className="text-blue-600 p-0 h-auto font-normal"
          >
            Sign up
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;