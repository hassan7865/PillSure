import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/react-select.css";
import { fontVariables } from "@/lib/font";
import { cn } from "@/lib/utils";
import QueryProvider from "@/providers/query-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "sonner";

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
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
