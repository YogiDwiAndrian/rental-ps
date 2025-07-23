import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NextAuthSessionProvider from "@/components/providers/session-provider";

// Font configuration - tetap sama
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SEO metadata
export const metadata: Metadata = {
  title: "RentalPS Platform",
  description: "SaaS Platform untuk Rental PlayStation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* 
          PENTING: Wrap children dengan NextAuthSessionProvider
          Ini membuat session tersedia di SEMUA page dan component
        */}
        <NextAuthSessionProvider>
          {children}
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}