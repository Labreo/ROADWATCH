'use client';

import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useStore } from '@/store/useStore';
import { ReactNode, useEffect } from 'react';
import { NetworkStatusProvider } from '@/providers/NetworkStatusProvider';
import OfflineBanner from './OfflineBanner';

interface ResponsiveShellProps {
  children: ReactNode;
}

export default function ResponsiveShell({ children }: ResponsiveShellProps) {
  const { sidebarOpen, loadCachedData } = useStore();

  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  return (
    <NetworkStatusProvider>
      <div className="flex w-screen h-screen bg-slate-950 font-sans antialiased text-slate-100 overflow-hidden">
        {/* 1. Collapsible Sidebar Navigation */}
        <Sidebar />

        {/* 2. Main Content Grid viewport */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          {/* 2a. Header Top Bar */}
          <TopNav />

          {/* Offline Warning & Pending uploads banner */}
          <OfflineBanner />

          {/* 2b. Core Content Section */}
          <main className="flex-1 flex flex-col p-4 md:p-6 min-h-0 overflow-y-auto relative bg-slate-950">
            {children}
          </main>
        </div>
      </div>
    </NetworkStatusProvider>
  );
}

