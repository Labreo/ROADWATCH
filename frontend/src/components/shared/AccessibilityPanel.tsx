'use client';

import { useStore } from '@/store/useStore';
import { useA11y } from '@/hooks/useA11y';
import type { FontSizeLevel, Locale } from '@/types';

export default function AccessibilityPanel() {
  const { contrastMode, setContrastMode, fontSize, setFontSize, locale, setLocale, reducedMotion, setReducedMotion } = useStore();
  const { t } = useA11y();

  return (
    <div
      role="region"
      aria-label={t('settings.a11y')}
      className="glass-depth-2 border border-white/[0.08] rounded-2xl shadow-2xl p-4 space-y-3"
    >
      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.12em]">{t('settings.a11y')}</h4>

      {/* High contrast toggle */}
      <div role="group" aria-label={t('settings.contrast')} className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#55555f]">{t('settings.contrast')}</span>
        <button
          onClick={() => setContrastMode(contrastMode === 'high' ? 'normal' : 'high')}
          aria-pressed={contrastMode === 'high'}
          className={`px-3 py-1 rounded-lg text-[9px] font-bold border transition-all ${
            contrastMode === 'high'
              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
              : 'bg-white/[0.03] border-white/[0.06] text-[#55555f]'
          }`}
        >
          {contrastMode === 'high' ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Font size control */}
      <div role="group" aria-label={t('settings.fontSize')} className="space-y-1.5">
        <span className="text-[10px] font-semibold text-[#55555f]">{t('settings.fontSize')}</span>
        <div className="flex gap-1">
          {(['small', 'default', 'large'] as FontSizeLevel[]).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              aria-pressed={fontSize === size}
              className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
                fontSize === size
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                  : 'bg-white/[0.03] border-white/[0.06] text-[#55555f]'
              }`}
            >
              {size === 'small' ? 'A−' : size === 'default' ? 'A' : 'A+'}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div role="group" aria-label={t('settings.locale')} className="space-y-1.5">
        <span className="text-[10px] font-semibold text-[#55555f]">{t('settings.locale')}</span>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          aria-label={t('settings.locale')}
          className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] font-semibold text-slate-300"
        >
          <option value="en-IN">English</option>
          <option value="hi-IN">हिन्दी</option>
          <option value="mr-IN">मराठी</option>
        </select>
      </div>

      {/* Reduced motion */}
      <div role="group" aria-label="Reduced motion" className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#55555f]">Reduced motion</span>
        <button
          onClick={() => setReducedMotion(!reducedMotion)}
          aria-pressed={reducedMotion}
          className={`px-3 py-1 rounded-lg text-[9px] font-bold border transition-all ${
            reducedMotion
              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
              : 'bg-white/[0.03] border-white/[0.06] text-[#55555f]'
          }`}
        >
          {reducedMotion ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}