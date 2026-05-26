'use client';

import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useStore } from '@/store/useStore';
import { ReactNode, useEffect } from 'react';
import { NetworkStatusProvider } from '@/providers/NetworkStatusProvider';
import OfflineBanner from './OfflineBanner';
import { 
  LayoutDashboard, 
  Map, 
  Globe, 
  Camera, 
  Menu 
} from 'lucide-react';

interface ResponsiveShellProps {
  children: ReactNode;
}

export default function ResponsiveShell({ children }: ResponsiveShellProps) {
  const { loadCachedData, activeView, setActiveView, toggleSidebar, setIsReporting } = useStore();

  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  return (
    <NetworkStatusProvider>
      <div className="flex w-screen h-screen bg-background font-sans antialiased text-foreground overflow-hidden relative">
        {/* 1. Collapsible Sidebar Navigation */}
        <Sidebar />

        {/* 2. Main Content Grid viewport */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          {/* 2a. Header Top Bar */}
          <TopNav />

          {/* Offline Warning & Pending uploads banner */}
          <OfflineBanner />

          {/* 2b. Core Content Section */}
          <main className="flex-1 flex flex-col p-4 md:p-6 pb-24 lg:pb-6 min-h-0 overflow-y-auto relative bg-background">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-4 inset-x-4 z-[1008] h-16 glass-command rounded-2xl border border-border/80 flex items-center justify-around px-2 shadow-2xl">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, action: () => setActiveView('dashboard') },
            { id: 'roads', label: 'Registry', icon: Map, action: () => setActiveView('roads') },
            { id: 'scan', label: 'Scan', icon: Camera, action: () => setIsReporting(true), highlight: true },
            { id: 'twin', label: 'Twin', icon: Globe, action: () => setActiveView('twin') },
            { id: 'more', label: 'More', icon: Menu, action: toggleSidebar }
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            if (item.highlight) {
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20 active:scale-95 transition-all cursor-pointer -mt-4 border border-cyan-300"
                  aria-label="Scan road defect"
                >
                  <Icon className="w-5 h-5 text-slate-950" />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-200 cursor-pointer ${
                  isActive ? 'text-cyan-400 scale-105 font-bold' : 'text-muted-foreground hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[8px] font-bold mt-1 tracking-wide uppercase">{item.label}</span>
                
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </NetworkStatusProvider>
  );
}

