"use client";

import { useState, useEffect } from "react";

/**
 * Hook that listens to the `prefers-reduced-motion` media query
 * and returns a boolean indicating whether the user prefers reduced motion.
 * Re-renders when the preference changes.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Set the initial value
    setPrefersReducedMotion(mq.matches);

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}
