'use client';

import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useStore } from '@/store/useStore';
import { ReactNode, useEffect } from 'react';
import { NetworkStatusProvider } from '@/providers/NetworkStatusProvider';
import OfflineBanner from './OfflineBanner';
import SyncToast from './SyncToast';
import {
  MessageSquare,
  Map,
  Coins,
  HardHat,
  type LucideProps,
} from 'lucide-react';

interface ResponsiveShellProps {
  children: ReactNode;
}

type NavItem = {
  id: string;
  label: string;
  icon: React.FC<LucideProps>;
  action: () => void;
  highlight?: boolean;
};

export default function ResponsiveShell({ children }: ResponsiveShellProps) {
  const { loadCachedData, activeView, setActiveView, setIsReporting } = useStore();

  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  const mobileNavItems: NavItem[] = [
    { id: 'chat',        label: 'Chat',        icon: MessageSquare, action: () => setActiveView('chat')        },
    { id: 'roads',       label: 'Map',         icon: Map,           action: () => setActiveView('roads')       },
    { id: 'budgets',     label: 'Budgets',     icon: Coins,         action: () => setActiveView('budgets')     },
    { id: 'contractors', label: 'Contractors', icon: HardHat,       action: () => setActiveView('contractors') },
  ];

  return (
    <NetworkStatusProvider>
      <div className="flex w-screen h-screen bg-background font-sans antialiased text-foreground overflow-hidden relative">

        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main viewport */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          {/* Top Navigation */}
          <TopNav />

          {/* Offline banner */}
          <OfflineBanner />

          {/* Content area */}
          <main
            id="main-content"
            className="flex-1 flex flex-col p-4 lg:p-5 pb-28 lg:pb-5 min-h-0 overflow-y-auto relative bg-background scroll-smooth"
          >
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation — premium pill bar */}
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-[1008] pb-safe"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="mx-3 mb-3 h-16 glass-depth-2 rounded-2xl border border-white/[0.08] flex items-center justify-around px-2 shadow-2xl">
            {mobileNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              if (item.highlight) {
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="flex flex-col items-center justify-center w-13 h-13 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-500 text-slate-950 shadow-lg shadow-cyan-400/25 btn-press -mt-5 border border-cyan-300/40"
                    style={{ width: '3.25rem', height: '3.25rem' }}
                    aria-label="Report road defect"
                  >
                    <Icon className="w-5 h-5 text-slate-950" />
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-200 btn-press rounded-xl ${
                    isActive ? 'text-cyan-400' : 'text-[#45455a] hover:text-slate-300'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} style={{ width: '1.05rem', height: '1.05rem' }} />
                  <span className={`text-[8px] font-black mt-1 tracking-[0.08em] uppercase transition-colors ${isActive ? 'text-cyan-400' : 'text-[#35354a]'}`}>
                    {item.label}
                  </span>

                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Offline → online sync confirmation toast (Flow E / KA-5) */}
        <SyncToast />
      </div>
    </NetworkStatusProvider>
  );
}
