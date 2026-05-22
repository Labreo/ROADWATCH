'use client';

import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useStore } from '@/store/useStore';
import { ReactNode } from 'react';

interface ResponsiveShellProps {
  children: ReactNode;
}

export default function ResponsiveShell({ children }: ResponsiveShellProps) {
  const { sidebarOpen } = useStore();

  return (
    <div className="flex w-screen h-screen bg-[#0f111a] font-sans antialiased text-slate-100 overflow-hidden">
      {/* 1. Collapsible Sidebar Navigation */}
      <Sidebar />

      {/* 2. Main Content Grid viewport */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* 2a. Header Top Bar */}
        <TopNav />

        {/* 2b. Core Content Section */}
        <main className="flex-1 flex flex-col p-4 md:p-6 min-h-0 overflow-y-auto relative bg-[#0c0e16]">
          {children}
        </main>
      </div>
    </div>
  );
}
