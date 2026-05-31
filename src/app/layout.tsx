import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyProvider } from "@/context/CompanyContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "AeroLedger AI - Financial Reporting Platform",
  description: "Multi-tenant intelligent SaaS financial reporting platform for accountants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-950 text-slate-100`}
      >
        <AuthProvider>
          <CompanyProvider>
            {children}
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
