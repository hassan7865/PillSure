import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { fontVariables } from "@/lib/font";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "sonner";
import FloatingRecommendationButton from "@/components/recommendation/FloatingRecommendationButton";

export const metadata: Metadata = {
  title: "Pillsure - Medication Management",
  description: "Your all-in-one solution for medication management and healthcare needs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "bg-background font-sans antialiased",
          fontVariables
        )}
      >
        <AuthProvider>
          {children}
          <FloatingRecommendationButton />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
