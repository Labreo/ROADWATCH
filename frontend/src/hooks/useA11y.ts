'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/store/useStore';
import type { Locale } from '@/types';
import en from '@/i18n/en-IN.json';
import hi from '@/i18n/hi-IN.json';
import mr from '@/i18n/mr-IN.json';

type I18nBundle = Record<string, string>;

const bundles: Record<Locale, I18nBundle> = {
  'en-IN': en,
  'hi-IN': hi,
  'mr-IN': mr,
};

export function useA11y() {
  const {
    contrastMode,
    fontSize,
    locale,
    reducedMotion,
    setReducedMotion,
  } = useStore();

  const cacheRef = useRef<{ locale: Locale; bundle: I18nBundle }>({
    locale: 'en-IN',
    bundle: en,
  });

  // Apply CSS classes to <html> on mount/value change
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('high-contrast', contrastMode === 'high');
  }, [contrastMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-size-small', 'font-size-large');
    if (fontSize !== 'default') {
      root.classList.add(`font-size-${fontSize}`);
    }
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.lang = locale === 'en-IN' ? 'en' : locale.split('-')[0];
  }, [locale]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduced-motion', reducedMotion);
  }, [reducedMotion]);

  // Watch prefers-reduced-motion media query
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setReducedMotion]);

  const t = useCallback(
    (key: string): string => {
      if (cacheRef.current.locale !== locale) {
        cacheRef.current = { locale, bundle: bundles[locale] || en };
      }
      return cacheRef.current.bundle[key] ?? key;
    },
    [locale]
  );

  return { contrastMode, fontSize, locale, reducedMotion, t };
}