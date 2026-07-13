import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/auth-hooks/useAuthProvider";
import { Providers } from "@/components/providers/query-provider";
import { Toaster, TooltipProvider } from "@/components/ui";
import { Spinner } from "@/components/ui/spinner";
import { Suspense } from "react";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LearnBridge AI — Your personalized career roadmap",
  description:
    "Upload your CV, pick a target role, and get an AI-generated learning roadmap with curated resources and knowledge-check quizzes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <TooltipProvider>
            <Suspense fallback={<Spinner page />}>
              <AuthProvider>{children}</AuthProvider>
            </Suspense>
          </TooltipProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
