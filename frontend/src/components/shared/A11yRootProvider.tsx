'use client';

import { ReactNode } from 'react';
import { useA11y } from '@/hooks/useA11y';

export default function A11yRootProvider({ children }: { children: ReactNode }) {
  // Mount once — hook applies contrast/font/reduced-motion/locale classes to <html>
  useA11y();
  return <>{children}</>;
}