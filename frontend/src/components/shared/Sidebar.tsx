'use client';

import { useStore, AppView } from '@/store/useStore';
import {
  MessageSquare,
  Map,
  HardHat,
  Coins,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Mission clock hook
function useClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setT(`${String(n.getUTCHours()).padStart(2,'0')}:${String(n.getUTCMinutes()).padStart(2,'0')}:${String(n.getUTCSeconds()).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// Nav section separator
function NavSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-1">
      <span className="text-[8px] font-black uppercase tracking-[0.18em] text-[#35354a] truncate">{label}</span>
      <div className="flex-1 h-px bg-[#1a1a24]" />
    </div>
  );
}

export default function Sidebar() {
  const {
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    activeView,
    setActiveView,
    syncQueueCount,
  } = useStore();

  const clock = useClock();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  const navSections = [
    {
      label: 'Navigation',
      items: [
        { id: 'chat'        as AppView, label: 'Chat Assistant',    icon: MessageSquare, badge: syncQueueCount > 0 ? syncQueueCount : undefined },
        { id: 'roads'       as AppView, label: 'Geospatial Map',    icon: Map },
        { id: 'budgets'     as AppView, label: 'Budget Compliance', icon: Coins },
        { id: 'contractors' as AppView, label: 'Contractor Scores', icon: HardHat },
      ] as { id: AppView; label: string; icon: any; badge?: string | number }[]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="lg:hidden fixed inset-0 z-[1015] bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Sidebar shell */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-[1016] flex flex-col h-full glass-frosted border-r border-white/[0.055] transition-all duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarOpen ? 'w-[240px] translate-x-0' : 'w-0 -translate-x-full lg:w-[68px] lg:translate-x-0 overflow-hidden lg:overflow-visible'
        }`}
        aria-label="Main Navigation Sidebar"
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-white/[0.055] justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            {/* Logo mark */}
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-600/20 border border-cyan-500/25 shadow-sm shrink-0">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col select-none animate-slide-reveal min-w-0">
                <span className="text-[12px] font-black tracking-[0.08em] text-slate-100 uppercase leading-none">
                  ROADWATCH
                </span>
                <span className="text-[8px] font-semibold text-cyan-500/60 uppercase tracking-[0.16em] mt-0.5">
                  Infrastructure Intelligence
                </span>
              </div>
            )}
          </div>

          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1.5 rounded-lg border border-white/[0.06] hover:border-cyan-500/30 text-[#55555f] hover:text-cyan-400 bg-black/20 transition-all duration-200 shrink-0"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Navigator */}
        <nav id="sidebar-nav" className="flex-1 py-3 overflow-y-auto overflow-x-hidden" aria-label="Main navigation">
          {navSections.map(section => (
            <div key={section.label}>
              {sidebarOpen && <NavSeparator label={section.label} />}
              <div className="px-2 space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      title={!sidebarOpen ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-[11px] font-semibold tracking-wide transition-all duration-200 group relative ${
                        isActive
                          ? 'nav-item-active text-slate-100 border-transparent'
                          : 'bg-transparent border-transparent text-[#55555f] hover:text-slate-300 hover:bg-white/[0.035]'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon
                        className={`nav-icon w-4.5 h-4.5 shrink-0 transition-all duration-200 ${
                          isActive ? 'text-cyan-400' : 'text-[#45455a] group-hover:text-slate-350'
                        }`}
                        style={{ width: '1.05rem', height: '1.05rem' }}
                      />

                      {sidebarOpen && (
                        <span className="flex-1 text-left truncate">{item.label}</span>
                      )}

                      {item.badge !== undefined && sidebarOpen && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500/20 text-[9px] font-black text-rose-400 border border-rose-500/30">
                          {item.badge}
                        </span>
                      )}

                      {/* Tooltip for collapsed mode */}
                      {!sidebarOpen && (
                        <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 border border-white/[0.08] rounded-lg text-[10px] font-semibold text-slate-200 whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        {!sidebarOpen && (
          <div className="hidden lg:flex items-center justify-center h-14 border-t border-white/[0.055] shrink-0">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg border border-white/[0.06] hover:border-cyan-500/30 text-[#55555f] hover:text-cyan-400 bg-black/20 transition-all"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {sidebarOpen && (
          <div className="px-3 pb-4 pt-2 border-t border-white/[0.055] shrink-0 space-y-2">
            {/* Status row */}
            <div className="flex items-center gap-2 text-[8px] py-2 px-3 rounded-xl bg-black/25 border border-white/[0.04]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500" />
              </span>
              <span className="font-bold tracking-[0.14em] uppercase text-[#45455a]">Engine v2.0</span>
              <span className="ml-auto font-black text-cyan-500/60 font-mono tracking-wider">{clock}</span>
            </div>
            {/* Version */}
            <p className="text-center text-[7px] text-[#2a2a38] font-mono tracking-widest uppercase">
              ROADWATCH · Mumbai Region
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
