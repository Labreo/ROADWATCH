'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const REGIONS = [
  { code: 'IN', name: 'India',            flag: '🇮🇳', currency: '₹ INR',  locale: 'en-IN'  },
  { code: 'GB', name: 'United Kingdom',   flag: '🇬🇧', currency: '£ GBP',  locale: 'en-GB'  },
  { code: 'US', name: 'United States',    flag: '🇺🇸', currency: '$ USD',  locale: 'en-US'  },
  { code: 'KE', name: 'Kenya',            flag: '🇰🇪', currency: 'KSh KES', locale: 'en-KE'  },
];

export default function RegionSelector() {
  const { regionCode, setRegionCode, setLocale } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = REGIONS.find((r) => r.code === regionCode) ?? REGIONS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (code: string, locale: string) => {
    setRegionCode(code);
    setLocale(locale);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
          bg-white/[0.03] border border-white/[0.05] text-[#45455a]
          hover:bg-white/[0.06] hover:text-slate-200 transition-all text-[9px] font-bold tracking-wide btn-press"
        aria-label={`Region: ${active.name}`}
        aria-expanded={open}
        aria-controls="region-dropdown"
      >
        <span className="text-[11px] leading-none">{active.flag}</span>
        <span className="hidden lg:inline">{active.code}</span>
        <ChevronDown
          className={`w-2.5 h-2.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="region-dropdown"
            role="listbox"
            aria-label="Select region"
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-[200px] glass-depth-2 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-[1050]"
          >
            {REGIONS.map((r) => {
              const isActive = r.code === regionCode;
              return (
                <button
                  key={r.code}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(r.code, r.locale)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-300'
                      : 'text-slate-300 hover:bg-white/[0.04] hover:text-slate-100'
                  }`}
                >
                  <span className="text-[15px] leading-none">{r.flag}</span>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[11px] font-bold leading-tight truncate">
                      {r.name}
                    </span>
                    <span className={`block text-[9px] font-mono mt-0.5 ${isActive ? 'text-cyan-400/70' : 'text-[#55555f]'}`}>
                      {r.currency}
                    </span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}