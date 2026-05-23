'use client';

import { useStore, AppView } from '@/store/useStore';
import { 
  LayoutDashboard, 
  Map, 
  HardHat, 
  Coins, 
  AlertTriangle, 
  Menu, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  History
} from 'lucide-react';
import { useEffect } from 'react';

export default function Sidebar() {
  const { 
    sidebarOpen, 
    toggleSidebar, 
    setSidebarOpen,
    activeView, 
    setActiveView,
    syncQueueCount
  } = useStore();

  // Handle window resizing to close sidebar automatically on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Set initial size
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  const navItems = [
    { id: 'dashboard' as AppView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'roads' as AppView, label: 'Road Registry', icon: Map },
    { id: 'contractors' as AppView, label: 'Contractors', icon: HardHat },
    { id: 'budgets' as AppView, label: 'Budget Audits', icon: Coins },
    { id: 'playback' as AppView, label: 'Time Playback', icon: History },
    { id: 'complaints' as AppView, label: 'Citizen Reports', icon: AlertTriangle, badge: syncQueueCount > 0 ? syncQueueCount : undefined },
    { id: 'admin' as AppView, label: 'Operations Center', icon: Shield }
  ];

  return (
    <>
      {/* Mobile Menu Trigger overlay */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed bottom-6 right-6 z-[1020] flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={toggleSidebar}
          className="lg:hidden fixed inset-0 z-[1015] bg-[#000000]/60 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-[1016] flex flex-col h-full glass-panel border-r border-border/80 transition-all duration-300 ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0 overflow-hidden lg:overflow-visible'
        }`}
        aria-label="Main Navigation Sidebar"
      >
        {/* Logo Section */}
        <div className="flex items-center h-20 px-6 border-b border-border/60 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/60 shadow-sm shrink-0">
              <Shield className="w-5 h-5 text-zinc-100" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col select-none">
                <span className="text-sm font-black tracking-wider text-slate-100 uppercase">
                  ROADWATCH
                </span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest -mt-0.5">
                  Accountability
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1.5 rounded-lg border border-border/60 hover:border-cyan-500/40 text-muted-foreground hover:text-cyan-400 bg-slate-950/40 transition-all"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border text-xs font-semibold tracking-wide transition-all group ${
                  isActive
                    ? 'bg-zinc-900 border-zinc-700/60 text-zinc-150 shadow-[0_1px_3px_rgba(0,0,0,0.15)]'
                    : 'bg-transparent border-transparent text-muted-foreground hover:text-slate-200 hover:bg-zinc-900/45'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-zinc-100' : 'text-muted-foreground group-hover:text-slate-350'
                }`} />
                
                {(sidebarOpen || window.innerWidth < 1024) && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                
                {item.badge !== undefined && (sidebarOpen || window.innerWidth < 1024) && (
                  <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-100 border border-zinc-700/60 shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer actions / collapse expansion fallback for icon-only mode */}
        {!sidebarOpen && (
          <div className="hidden lg:flex items-center justify-center h-16 border-t border-border/60 py-4">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg border border-border/60 hover:border-cyan-500/40 text-muted-foreground hover:text-cyan-400 bg-slate-950/40 transition-all"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {sidebarOpen && (
          <div className="p-4 border-t border-border/60 text-center shrink-0">
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground bg-zinc-900/50 py-1.5 px-2 rounded-lg border border-border/40">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 inline-block animate-pulse"></span>
              <span className="font-semibold tracking-wider uppercase">Engine v1.0.0-Beta</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
