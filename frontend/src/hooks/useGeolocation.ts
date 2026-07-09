'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

interface GeolocationState {
  position: GeolocationPosition | null;
  error: string | null;
  loading: boolean;
  retry: () => void;
}

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos);
        setError(null);
        setLoading(false);
      },
      (err) => {
        let msg: string;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location permission denied';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'Location unavailable';
            break;
          case err.TIMEOUT:
            msg = 'Location request timed out';
            break;
          default:
            msg = 'Unknown location error';
        }
        setError(msg);
        setLoading(false);
      },
      GEO_OPTIONS
    );
  }, []);

  const retry = useCallback(() => {
    requestPosition();
  }, [requestPosition]);

  // Initial request on mount
  useEffect(() => {
    requestPosition();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestPosition]);

  return { position, error, loading, retry };
}