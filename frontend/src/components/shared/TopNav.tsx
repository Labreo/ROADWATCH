'use client';

import { useStore } from '@/store/useStore';
import {
  Search,
  Wifi,
  WifiOff,
  Bell,
  User,
  Menu,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { NotificationItem } from '@/types';

const VIEW_TITLES: Record<string, { label: string; section: string }> = {
  dashboard:   { label: 'Dashboard Overview',             section: 'Intelligence'   },
  roads:       { label: 'Road Registry',                  section: 'Intelligence'   },
  contractors: { label: 'Contractor Transparency',        section: 'Accountability' },
  budgets:     { label: 'Budget & Expense Audits',        section: 'Accountability' },
  playback:    { label: 'Historical Playback',            section: 'Accountability' },
  complaints:  { label: 'Citizen Defect Reports',         section: 'Accountability' },
  sensors:     { label: 'Sensor Monitor',                 section: 'Intelligence'   },
  twin:        { label: 'Digital Twin',                   section: 'Intelligence'   },
  admin:       { label: 'Operations Center',              section: 'System'         },
};

export default function TopNav() {
  const {
    activeView,
    searchQuery,
    setSearchQuery,
    isOnline,
    setIsOnline,
    toggleSidebar,
  } = useStore();

  const [notifOpen, setNotifOpen]   = useState(false);
  const [theme, setTheme]           = useState<'dark' | 'light'>('dark');
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    setTheme(stored);
    document.documentElement.classList.toggle('light', stored === 'light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
  };

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, [setIsOnline]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: 'n1', title: 'Project Delayed',     message: 'SV Road drainage project halted. Delay audit triggered.',           timestamp: '10m ago', read: false, type: 'alert'   },
    { id: 'n2', title: 'Pothole Routed',      message: 'Report #18981 (Andheri East) assigned to Ward K-West.',              timestamp: '2h ago',  read: false, type: 'success' },
    { id: 'n3', title: 'Budget 90% Reached',  message: 'Eastern Express Highway project reached 90% budget utilization.',    timestamp: '5h ago',  read: true,  type: 'warning' },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const notifIconColor = (type: string) => {
    if (type === 'alert')   return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
    if (type === 'success') return <CheckCircle   className="w-3.5 h-3.5 text-emerald-400" />;
    if (type === 'warning') return <Clock         className="w-3.5 h-3.5 text-amber-400" />;
    return <Bell className="w-3.5 h-3.5 text-cyan-400" />;
  };

  const viewMeta = VIEW_TITLES[activeView] ?? { label: 'ROADWATCH', section: '' };

  return (
    <header className="sticky top-0 z-[1005] w-full h-14 glass-frosted px-4 lg:px-6 flex items-center justify-between gap-3 shrink-0">

      {/* Left: burger + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl border border-white/[0.06] hover:bg-white/[0.04] transition-all text-slate-400 hover:text-slate-100 btn-press"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] font-bold text-[#45455a] uppercase tracking-[0.14em] shrink-0">
            {viewMeta.section}
          </span>
          <ChevronRight className="w-3 h-3 text-[#2a2a38] shrink-0" />
          <h1 className="text-[12px] font-black text-slate-200 tracking-[-0.01em] truncate">
            {viewMeta.label}
          </h1>
        </div>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-[380px] relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 left-3 w-3.5 h-3.5 transition-colors duration-200 ${searchFocused ? 'text-cyan-400' : 'text-[#45455a]'}`} />
        <input
          type="text"
          placeholder="Search roads, contractors, reports…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="search-input w-full pl-9 pr-12 py-2 text-[11px] bg-white/[0.035] border border-white/[0.06] rounded-xl placeholder-[#45455a] text-slate-200 transition-all"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[8px] text-[#45455a] font-mono pointer-events-none select-none">
          ⌘K
        </kbd>
      </div>

      {/* Right: action tray */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Network status */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold tracking-wide transition-all ${
            isOnline
              ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400'
              : 'bg-rose-950/50 border-rose-900/50 text-rose-400 animate-pulse'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          {isOnline ? (
            <><Wifi className="w-3 h-3" /><span className="hidden lg:inline">Online</span></>
          ) : (
            <><WifiOff className="w-3 h-3" /><span>Offline</span></>
          )}
        </div>

        {/* Region chip */}
        <span className="hidden lg:inline-flex items-center text-[8px] bg-white/[0.03] border border-white/[0.05] text-[#45455a] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full">
          Mumbai · MH
        </span>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-white/[0.06] hover:bg-white/[0.05] transition-all text-[#55555f] hover:text-slate-200 btn-press"
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-xl border border-white/[0.06] hover:bg-white/[0.05] transition-all text-[#55555f] hover:text-slate-200 btn-press"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-[320px] glass-depth-2 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-[1050] animate-toast-in">
              <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-[11px] font-black text-slate-200 uppercase tracking-wider">Alerts</h4>
                  {unreadCount > 0 && (
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-white/[0.04] max-h-[280px] overflow-y-auto">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 hover:bg-white/[0.025] transition-colors ${n.read ? 'opacity-55' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="shrink-0 mt-0.5">{notifIconColor(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-[10px] font-black text-slate-200">{n.title}</span>
                          <span className="text-[8px] text-[#45455a] font-mono shrink-0">{n.timestamp}</span>
                        </div>
                        <p className="text-[9px] text-[#55555f] leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center gap-1.5">
                <Settings className="w-2.5 h-2.5 text-[#35354a]" />
                <span className="text-[8px] text-[#35354a] font-mono tracking-wider">Alert parameters configured</span>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <button className="w-8 h-8 rounded-full border border-cyan-500/25 bg-gradient-to-br from-cyan-950/60 to-indigo-950/60 flex items-center justify-center text-cyan-400 hover:border-cyan-500/50 transition-all btn-press shadow-sm">
          <User className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
