'use client';

import { useStore } from '@/store/useStore';
import { 
  Search, 
  Wifi, 
  WifiOff, 
  Bell, 
  User, 
  MapPin, 
  Menu,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
  Sun,
  Moon
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { NotificationItem } from '@/types';

export default function TopNav() {
  const { 
    activeView, 
    searchQuery, 
    setSearchQuery, 
    isOnline, 
    setIsOnline,
    toggleSidebar
  } = useStore();

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const currentTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    setTheme(currentTheme);
    if (currentTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  // Connection listener
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [setIsOnline]);

  // Click outside listener for notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mock notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      title: 'Project Delayed',
      message: 'SV Road drainage project has been halted. Delay audit triggered.',
      timestamp: '10m ago',
      read: false,
      type: 'alert'
    },
    {
      id: 'n2',
      title: 'Pothole Routed',
      message: 'Report #18981 (Andheri East) assigned to Ward K-West.',
      timestamp: '2h ago',
      read: false,
      type: 'success'
    },
    {
      id: 'n3',
      title: 'Budget Threshold Met',
      message: 'Eastern Express Highway project has reached 90% budget utilization.',
      timestamp: '5h ago',
      read: true,
      type: 'warning'
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getViewTitle = (view: string) => {
    switch (view) {
      case 'dashboard': return 'Dashboard Overview';
      case 'roads': return 'Road Registry Explorer';
      case 'contractors': return 'Contractor Transparency Panel';
      case 'budgets': return 'Budget & Expense Audits';
      case 'playback': return 'Historical Road Playback';
      case 'complaints': return 'Citizen Defect Reports';
      default: return 'ROADWATCH Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-[1005] w-full h-20 glass-panel border-b border-border/80 px-6 flex items-center justify-between gap-4">
      {/* View Title & Sidebar Button (Mobile) */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg border border-border/60 hover:bg-slate-900 transition-colors"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-4 h-4 text-slate-100" />
        </button>
        <div className="hidden sm:block">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
            ROADWATCH / {activeView}
          </span>
          <h1 className="text-sm font-black text-slate-100 uppercase tracking-wide">
            {getViewTitle(activeView)}
          </h1>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute top-2.5 left-3 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search road index, contractor code... (⌘K)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-10 py-2 text-xs bg-slate-900/50 border border-border/80 rounded-xl placeholder-muted-foreground text-foreground focus:outline-none focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500/25 transition-all shadow-inner"
        />
        <span className="absolute right-3 top-2.5 px-1.5 py-0.5 rounded bg-slate-900/80 border border-border text-[9px] text-muted-foreground font-semibold font-mono leading-none select-none pointer-events-none">
          ⌘K
        </span>
      </div>

      {/* Action Tray */}
      <div className="flex items-center gap-4 shrink-0">
        
        {/* Dynamic Network Status Indicator */}
        <div 
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-semibold transition-all ${
            isOnline 
              ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400' 
              : 'bg-red-950/60 border-red-900/60 text-red-400 animate-pulse'
          }`}
          title={isOnline ? "You are online. Real-time updates active." : "Offline Mode. Changes queued locally for sync."}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Online / Sync Active</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </>
          )}
        </div>

        {/* Region Code */}
        <span className="hidden md:inline-block text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-350 font-bold tracking-wide uppercase px-2 py-0.5 rounded">
          Mumbai Corp
        </span>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-border/60 hover:bg-slate-900 transition-colors text-slate-350 hover:text-slate-100 flex items-center justify-center cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative p-2 rounded-xl border border-border/60 hover:bg-slate-900 transition-colors text-slate-300 hover:text-slate-100"
            aria-label="View Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-100"></span>
              </span>
            )}
          </button>

          {/* Dropdown Card */}
          {notifDropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-slate-950 border border-border/80 rounded-xl shadow-2xl overflow-hidden z-[1050] animate-in fade-in slide-in-from-top-3 duration-250">
              <div className="p-3.5 border-b border-border/60 bg-slate-900/40 flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wide">Audit Notifications</h4>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-border/40 max-h-[250px] overflow-y-auto">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-3 text-left hover:bg-slate-900/35 transition-colors ${
                      n.read ? 'opacity-65' : 'bg-slate-900/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getNotifIcon(n.type)}
                      <span className="text-xs font-bold text-slate-200">{n.title}</span>
                      <span className="text-[9px] text-muted-foreground ml-auto">{n.timestamp}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal pl-6">{n.message}</p>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-border/60 bg-slate-900/20 text-center">
                <span className="text-[9px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                  <Settings className="w-3 h-3" /> Custom Alert Parameters Configured
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Profile placeholder */}
        <div className="w-8 h-8 rounded-full border border-cyan-500/30 bg-slate-900 flex items-center justify-center text-cyan-400 cursor-pointer hover:border-cyan-500 transition-colors shadow">
          <User className="w-4 h-4" />
        </div>

      </div>
    </header>
  );
}
