import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import ResponsiveShell from "@/components/shared/ResponsiveShell";
import A11yRootProvider from "@/components/shared/A11yRootProvider";

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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-slate-950 focus:rounded-lg focus:text-xs focus:font-bold"
        >
          Skip to main content
        </a>
        <a
          href="#sidebar-nav"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-60 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-slate-950 focus:rounded-lg focus:text-xs focus:font-bold"
        >
          Skip to navigation
        </a>
        <A11yRootProvider>
          <ResponsiveShell>{children}</ResponsiveShell>
        </A11yRootProvider>
      </body>
    </html>
  );
}
