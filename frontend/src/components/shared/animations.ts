import { Transition, Variants } from 'framer-motion';

// Premium spring configurations mimicking Apple Maps and Linear UI feel
export const springs = {
  default: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  bouncy: { type: 'spring', stiffness: 400, damping: 25 } as Transition,
  slow: { type: 'spring', stiffness: 180, damping: 24 } as Transition,
  sheet: { type: 'spring', stiffness: 220, damping: 28, mass: 0.8 } as Transition,
};

// Cinematic easing curves
export const easings = {
  cinematic: [0.16, 1, 0.3, 1] as const, // cubic-bezier
  reveal: [0.22, 1, 0.36, 1] as const,
  snap: [0.4, 0, 0.2, 1] as const,
};

// Framer Motion Variants for layout pages and floating overlay sheets
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easings.cinematic } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: easings.snap } },
};

// Overlay / backdrop transitions
export const backdropTransition: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

// Floating Side panels sliding variants
export const slideInRight: Variants = {
  hidden: { x: '100%', opacity: 0.8 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 28 } },
  exit: { x: '100%', opacity: 0.8, transition: { duration: 0.25, ease: 'easeIn' } },
};

export const slideInLeft: Variants = {
  hidden: { x: '-100%', opacity: 0.8 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 28 } },
  exit: { x: '-100%', opacity: 0.8, transition: { duration: 0.25, ease: 'easeIn' } },
};

// Staggered list items reveal
export const containerStagger = {
  animate: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

export const itemFadeInUp: Variants = {
  initial: { y: 15, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, ease: easings.reveal } },
};

// Interactive card click scaling properties
export const hoverScale = {
  hover: { scale: 1.015, y: -2, transition: { duration: 0.2, ease: 'easeInOut' } },
  tap: { scale: 0.985, transition: { duration: 0.1 } },
};
