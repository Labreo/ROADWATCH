'use client';

import React, { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { hoverScale } from './animations';

type CardDepth = 'standard' | 'depth-2' | 'command' | 'card';
type CardGlow = 'none' | 'cyan' | 'rose' | 'active';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'className' | 'children' | 'style'> {
  children: ReactNode;
  depth?: CardDepth;
  glow?: CardGlow;
  hoverRaise?: boolean;
  animate?: boolean;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function Card({
  children,
  depth = 'standard',
  glow = 'none',
  hoverRaise = false,
  animate = false,
  className = '',
  onClick,
  style,
  ...motionProps
}: CardProps) {
  
  // Resolve class names based on glassmorphic depth configurations
  const getDepthClass = (depth: CardDepth) => {
    switch (depth) {
      case 'depth-2': return 'glass-depth-2';
      case 'command': return 'glass-command';
      case 'card':    return 'glass-card';
      default:        return 'glass-panel';
    }
  };

  // Resolve glowing highlights
  const getGlowClass = (glow: CardGlow) => {
    switch (glow) {
      case 'cyan':   return 'glow-line-cyan';
      case 'rose':   return 'glow-line-rose';
      case 'active': return 'glow-border-active';
      default:       return '';
    }
  };

  const baseClasses = `
    rounded-2xl 
    border 
    border-border/60 
    overflow-hidden 
    relative 
    ${getDepthClass(depth)} 
    ${getGlowClass(glow)} 
    ${hoverRaise ? 'hover-raise' : ''} 
    ${onClick ? 'cursor-pointer' : ''} 
    ${className}
  `.replace(/\s+/g, ' ').trim();

  // If animations are enabled, render using framer-motion
  if (animate || onClick) {
    return (
      <motion.div
        onClick={onClick}
        className={baseClasses}
        style={style}
        whileHover={hoverRaise || onClick ? (hoverScale.hover as any) : undefined}
        whileTap={onClick ? (hoverScale.tap as any) : undefined}
        {...motionProps}
      >
        {children}
      </motion.div>
    );
  }

  // Fallback to static HTML div for performance on non-interactive containers
  return (
    <div 
      onClick={onClick} 
      className={baseClasses} 
      style={style}
    >
      {children}
    </div>
  );
}
