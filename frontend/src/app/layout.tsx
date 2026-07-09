import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import "@/styles/a11y.css";
import ResponsiveShell from "@/components/shared/ResponsiveShell";
import A11yRootProvider from "@/components/shared/A11yRootProvider";
import SkipLink from "@/components/shared/SkipLink";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ROADWATCH | AI-Powered Road Accountability Platform",
  description: "Monitor road quality, track contractor performance, view municipal budgets, and report road defects in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SkipLink href="#main-content" label="Skip to main content" position="left" />
        <SkipLink href="#sidebar-nav" label="Skip to navigation" position="nav" />
        <A11yRootProvider>
          <ResponsiveShell>{children}</ResponsiveShell>
        </A11yRootProvider>
      </body>
    </html>
  );
}
