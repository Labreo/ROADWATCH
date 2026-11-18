'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';

interface NetworkStatusContextType {
  isOnline: boolean;
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'offline';
  rtt?: number;
  downlink?: number;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  effectiveType: '4g'
});

export const useNetworkStatus = () => useContext(NetworkStatusContext);

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const setIsOnline = useStore(state => state.setIsOnline);
  
  const [status, setStatus] = useState<NetworkStatusContextType>({
    isOnline: typeof window !== 'undefined' ? window.navigator.onLine : true,
    effectiveType: '4g'
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('ROADWATCH Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      } else {
        // A worker left over from an earlier run serves stale dev chunks.
        navigator.serviceWorker.getRegistrations()
          .then((registrations) => registrations.forEach((registration) => registration.unregister()));
        if ('caches' in window) {
          caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
        }
      }
    }

    const getConnectionInfo = () => {
      const conn = (navigator as any).connection;
      if (!conn) return { effectiveType: '4g' as const };
      
      return {
        effectiveType: conn.effectiveType as '4g' | '3g' | '2g' | 'slow-2g',
        rtt: conn.rtt,
        downlink: conn.downlink
      };
    };

    const updateStatus = () => {
      const online = navigator.onLine;
      const connInfo = getConnectionInfo();
      
      const newStatus = {
        isOnline: online,
        effectiveType: online ? connInfo.effectiveType : 'offline' as const,
        rtt: online ? connInfo.rtt : undefined,
        downlink: online ? connInfo.downlink : undefined
      };

      setStatus(newStatus);
      setIsOnline(online);
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', updateStatus);
    }

    // Initial load check
    updateStatus();

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (conn) {
        conn.removeEventListener('change', updateStatus);
      }
    };
  }, [setIsOnline]);

  return (
    <NetworkStatusContext.Provider value={status}>
      {children}
    </NetworkStatusContext.Provider>
  );
}
