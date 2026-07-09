'use client';

import React, { ReactNode, useRef, useEffect } from 'react';
import { motion, useDragControls, AnimatePresence } from 'framer-motion';
import { springs } from './animations';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: number[]; // Percentage of screen height e.g. [30, 60, 95]
  defaultSnapPoint?: number;
  desktopWidth?: string; // e.g. "360px"
  hasBackdrop?: boolean;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [25, 60, 90], // Peek, Half-screen, Fully expanded
  defaultSnapPoint = 25,
  desktopWidth = '350px',
  hasBackdrop = true,
}: BottomSheetProps) {
  
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [mounted, setMounted] = React.useState(false);

  useFocusTrap(sheetRef, isOpen && mounted, onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Snapping logic thresholds
  const getSnapPositions = () => {
    if (typeof window === 'undefined') return [0];
    const height = window.innerHeight;
    // Map percentages to y offsets from the top
    return snapPoints.map(pct => height - (height * pct) / 100);
  };

  const positions = getSnapPositions();

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay for mobile view (Only triggers overlay close when fully expanded or for general backing click) */}
          {hasBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-hidden="true"
              className="lg:hidden fixed inset-0 bg-[#000000]/40 backdrop-blur-sm z-[1010]"
            />
          )}

          {/* Bottom Sheet Drawer Shell */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Panel'}
            initial={{ y: '100%' }}
            animate={{ 
              y: typeof window !== 'undefined' ? window.innerHeight - (window.innerHeight * defaultSnapPoint) / 100 : 0
            }}
            exit={{ y: '100%' }}
            transition={springs.sheet}
            drag="y"
            dragControls={dragControls}
            dragListener={false} // Only drag using drag handle
            dragConstraints={{ top: positions[positions.length - 1], bottom: typeof window !== 'undefined' ? window.innerHeight - 50 : 0 }}
            dragElastic={0.2}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (typeof window === 'undefined') return;
              const y = info.point.y;
              const height = window.innerHeight;
              
              // Calculate nearest snap point
              const currentPositions = snapPoints.map(pct => height - (height * pct) / 100);
              const closest = currentPositions.reduce((prev, curr) => 
                Math.abs(curr - y) < Math.abs(prev - y) ? curr : prev
              );
              
              // If dragged too low (below lowest snap point or offset velocity), trigger close
              const lowestPosition = currentPositions[0];
              if (y > lowestPosition + 100 || info.velocity.y > 600) {
                onClose();
              } else if (sheetRef.current) {
                // Animate to nearest snap point
                sheetRef.current.style.transform = `translate3d(0, ${closest}px, 0)`;
              }
            }}
            // Responsive shell design:
            // Mobile: fixed bottom sheet sliding up from bottom
            // Desktop: floats as a card overlay in the top-right/left
            className="fixed inset-x-0 top-0 h-screen z-[1012] lg:z-10 rounded-t-3xl lg:rounded-2xl glass-depth-2 border border-border/80 border-t-2 border-t-cyan-500/35 lg:border-t-2 lg:border-t-cyan-500/35 lg:shadow-2xl flex flex-col select-none pointer-events-auto
              lg:absolute lg:top-4 lg:bottom-4 lg:right-4 lg:inset-x-auto lg:translate-y-0 lg:h-auto lg:max-h-[calc(100vh-2rem)]"
            style={{ 
              width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? desktopWidth : 'auto',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.15), var(--shadow-premium-lg)'
            }}
          >
            {/* Grab Handle Header (Touch gesture indicator for mobile) */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              aria-hidden="true"
              className="lg:hidden w-full h-8 flex items-center justify-center cursor-ns-resize active:scale-95 transition-all touch-none shrink-0"
            >
              <div className="w-12 h-1.2 bg-slate-650 rounded-full opacity-80 hover:opacity-100 transition-opacity" />
            </div>

            {/* Panel Title Bar */}
            <header className="px-5 py-3 border-b border-border/40 flex items-center justify-between shrink-0">
              <h3 className="h3-premium text-slate-100">{title}</h3>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-xl border border-border hover:bg-slate-900/60 text-muted-foreground hover:text-slate-100 transition-colors"
                aria-label="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Scrollable Container Content */}
            <div className="flex-1 overflow-y-auto p-5 select-text touch-pan-y">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
