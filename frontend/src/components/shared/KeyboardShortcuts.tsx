'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Command, ArrowRight } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useStore, AppView } from '@/store/useStore';
import { springs, backdropTransition } from './animations';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShortcutEntry {
  keys: string[];
  label: string;
  description: string;
  group: string;
  action: () => void;
}

const GROUP_ORDER = ['Navigation', 'Views', 'Actions', 'Accessibility', 'Demo'] as const;
type ShortcutGroup = (typeof GROUP_ORDER)[number];

// ── Hook: useKeyboardShortcuts ─────────────────────────────────────────────────

/**
 * Registers a global keyboard shortcut listener.
 * Returns { isOpen, setIsOpen } for the help modal.
 * Callers can also trigger shortcuts by pressing chord sequences like "G+R".
 */
export function useKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Chord buffer for G+letter sequences
  const chordBuffer = useRef<string[]>([]);
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearChord = useCallback(() => {
    chordBuffer.current = [];
    if (chordTimer.current) {
      clearTimeout(chordTimer.current);
      chordTimer.current = null;
    }
  }, []);

  // Build shortcut map (re-built on each call — memoization for stable refs is done in effect)
  const executeShortcut = useCallback((keys: string[]) => {
    const key = keys.join('+');
    const shortcuts: Record<string, () => void> = {
      'G+R': () => useStore.getState().setActiveView('roads'),
      'G+C': () => useStore.getState().setActiveView('chat'),
      'G+M': () => useStore.getState().setActiveView('roads'),
      'G+B': () => useStore.getState().setActiveView('budgets'),
      'G+T': () => useStore.getState().setActiveView('twin'),
      'G+P': () => useStore.getState().setActiveView('playback'),
      'G+S': () => useStore.getState().setActiveView('sensors'),
      'G+O': () => useStore.getState().setActiveView('admin'),
      'G+E': () => useStore.getState().setActiveView('regions'),
      'G+D': () => useStore.getState().setActiveView('dashboard'),
      'Escape': () => setIsOpen(false),
    };
    const fn = shortcuts[key];
    if (fn) {
      clearChord();
      fn();
    }
  }, [clearChord]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      // But still allow Escape and ? when not in help modal
      if (isEditable && e.key !== 'Escape' && e.key !== '?') return;

      // ? key opens help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Escape closes help
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      // Chord handling: G + letter
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        clearChord();
        chordBuffer.current = ['G'];
        chordTimer.current = setTimeout(clearChord, 600); // 600ms window
        return;
      }

      if (chordBuffer.current.length === 1 && chordBuffer.current[0] === 'G') {
        const letter = e.key.toUpperCase();
        if (/^[A-Z]$/.test(letter)) {
          e.preventDefault();
          executeShortcut(['G', letter]);
          return;
        }
      }

      // Single-key shortcuts when modal is NOT open
      if (!isOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // No single-key shortcuts currently; all are chord-based
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearChord();
    };
  }, [isOpen, executeShortcut, clearChord]);

  return { isOpen, setIsOpen, searchQuery, setSearchQuery };
}

// ── Shortcut definitions (stable, not recreated on render) ─────────────────────

function buildShortcuts(onNavigate: (view: AppView) => void): ShortcutEntry[] {
  return [
    // Navigation
    { keys: ['G', 'R'], label: 'G + R', description: 'Go to Roads / Map view', group: 'Views', action: () => onNavigate('roads') },
    { keys: ['G', 'C'], label: 'G + C', description: 'Open Chat / AI Assistant', group: 'Views', action: () => onNavigate('chat') },
    { keys: ['G', 'M'], label: 'G + M', description: 'Focus Map view', group: 'Views', action: () => onNavigate('roads') },
    { keys: ['G', 'B'], label: 'G + B', description: 'Open Budget transparency', group: 'Views', action: () => onNavigate('budgets') },
    { keys: ['G', 'T'], label: 'G + T', description: 'Open Digital Twin', group: 'Views', action: () => onNavigate('twin') },
    { keys: ['G', 'P'], label: 'G + P', description: 'Open Playback / Timeline', group: 'Views', action: () => onNavigate('playback') },
    { keys: ['G', 'S'], label: 'G + S', description: 'Open Sensors dashboard', group: 'Views', action: () => onNavigate('sensors') },
    { keys: ['G', 'O'], label: 'G + O', description: 'Open Admin / Operations', group: 'Views', action: () => onNavigate('admin') },
    { keys: ['G', 'E'], label: 'G + E', description: 'Open Regions explorer', group: 'Views', action: () => onNavigate('regions') },
    { keys: ['G', 'D'], label: 'G + D', description: 'Open Dashboard / overview', group: 'Views', action: () => onNavigate('dashboard') },
    // Actions
    { keys: ['?'], label: '?', description: 'Toggle this help modal', group: 'Actions', action: () => {} },
    { keys: ['Esc'], label: 'Esc', description: 'Close modals, panels, and popups', group: 'Actions', action: () => {} },
  ];
}

// ── Kbd Badge ──────────────────────────────────────────────────────────────────

function KbdBadge({ keys }: { keys: string[] }) {
  return (
    <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold
      text-slate-300 bg-slate-800/80 border border-slate-700/60 rounded-md shadow-sm
      leading-none tracking-tight uppercase"
    >
      {keys.map((k, i) => (
        <React.Fragment key={k}>
          {i > 0 && <span className="text-slate-500 mx-0.5">+</span>}
          <span>{k}</span>
        </React.Fragment>
      ))}
    </kbd>
  );
}

// ── Component: KeyboardShortcuts (help modal) ──────────────────────────────────

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function KeyboardShortcuts({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
}: KeyboardShortcutsProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  // Focus trap + auto-focus search input
  useFocusTrap(modalRef, isOpen && mounted, onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && mounted && searchInputRef.current) {
      // Slight delay for animation to settle
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [isOpen, mounted]);

  const handleNavigate = useCallback((view: AppView) => {
    useStore.getState().setActiveView(view);
    onClose();
  }, [onClose]);

  const shortcuts = useMemo(() => buildShortcuts(handleNavigate), [handleNavigate]);

  // Group + filter
  const grouped = useMemo(() => {
    const filtered = searchQuery
      ? shortcuts.filter(
          (s) =>
            s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.group.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : shortcuts;

    const groups: { group: string; items: ShortcutEntry[] }[] = [];
    const groupMap = new Map<string, ShortcutEntry[]>();

    for (const s of filtered) {
      const arr = groupMap.get(s.group);
      if (arr) arr.push(s);
      else groupMap.set(s.group, [s]);
    }

    // Maintain group order
    for (const g of GROUP_ORDER) {
      const items = groupMap.get(g);
      if (items) groups.push({ group: g, items });
    }
    // Any remaining groups
    for (const [g, items] of groupMap) {
      if (!GROUP_ORDER.includes(g as any)) {
        groups.push({ group: g, items });
      }
    }

    return groups;
  }, [shortcuts, searchQuery]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="kbd-backdrop"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropTransition}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-[#000000]/50 backdrop-blur-sm z-[2000]"
          />

          {/* Modal */}
          <motion.div
            key="kbd-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={springs.default}
            className="fixed inset-4 sm:inset-auto sm:top-[10%] sm:left-1/2 sm:-translate-x-1/2
              w-full sm:w-[520px] max-h-[80vh] z-[2001]
              flex flex-col
              rounded-2xl border border-border/60
              glass-depth-3
              shadow-2xl shadow-black/40
              overflow-hidden"
          >
            {/* ── Header: Title + Search ── */}
            <header className="shrink-0 border-b border-border/40">
              {/* Title row */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Command className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-semibold text-slate-100 tracking-tight">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl border border-border hover:bg-slate-800/80
                    text-muted-foreground hover:text-slate-100 transition-colors"
                  aria-label="Close shortcuts"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-5 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search shortcuts..."
                    className="w-full pl-9 pr-3 py-2 text-sm
                      bg-slate-900/60 border border-slate-700/50 rounded-lg
                      text-slate-200 placeholder:text-slate-500
                      focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50
                      transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500
                        hover:text-slate-300 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </header>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 pt-3">
              {grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                  <Search className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No shortcuts found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                grouped.map(({ group, items }) => (
                  <section key={group} className="mb-5 last:mb-0">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2 px-1">
                      {group}
                    </h3>
                    <div className="space-y-0.5">
                      {items.map((item, idx) => (
                        <button
                          key={`${item.label}-${idx}`}
                          onClick={() => {
                            item.action();
                          }}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2
                            rounded-lg text-left
                            hover:bg-slate-800/60 hover:border-slate-700/40
                            border border-transparent
                            transition-colors duration-150
                            group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400
                              transition-colors shrink-0" />
                            <span className="text-sm text-slate-300 group-hover:text-slate-100
                              transition-colors truncate">
                              {item.description}
                            </span>
                          </div>
                          <KbdBadge keys={item.keys} />
                        </button>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>

            {/* ── Footer hint ── */}
            <footer className="shrink-0 px-5 py-3 border-t border-border/40 flex items-center justify-between
              text-[11px] text-slate-600">
              <span>Press <kbd className="px-1 py-0.5 text-[10px] font-mono bg-slate-800/60
                border border-slate-700/40 rounded text-slate-400">?</kbd> to toggle</span>
              <span className="hidden sm:inline">G + letter navigates to views</span>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Convenience export: pre-wired component ────────────────────────────────────

/**
 * Fully wired KeyboardShortcuts panel with integrated hook.
 * Drop <KeyboardShortcutsPanel /> anywhere in your app tree (one instance).
 */
export function KeyboardShortcutsPanel() {
  const { isOpen, setIsOpen, searchQuery, setSearchQuery } = useKeyboardShortcuts();

  return (
    <KeyboardShortcuts
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    />
  );
}