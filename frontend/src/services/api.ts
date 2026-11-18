import { useCallback, useEffect, useState } from 'react';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface SessionUser {
  id: number;
  email: string;
  display_name: string;
  role: 'citizen' | 'engineer' | 'admin' | 'auditor';
  citizen_id: number | null;
  authority_id: number | null;
}

export interface Session {
  token: string;
  user: SessionUser;
}

const SESSION_KEY = 'rw_session';

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  if (typeof window === 'undefined') return;
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
}

export function authHeaders(): Record<string, string> {
  const session = loadSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  } catch {
    throw new ApiError('Backend is not reachable. Start it with scripts/dev-backend.sh.', 0);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status})`;
    throw new ApiError(detail, response.status);
  }
  return response.json();
}

export const apiGet = <T,>(path: string) => request<T>(path);

export const apiPost = <T,>(path: string, body?: unknown) =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const apiDelete = <T,>(path: string) => request<T>(path, { method: 'DELETE' });

/** Fetch a backend read model. `reload` refetches after an action succeeds. */
export function useLive<T>(path: string | null, refreshMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);

  const reload = useCallback(() => {
    if (!path) return Promise.resolve();
    return apiGet<T>(path)
      .then(next => {
        setData(next);
        setError(null);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Request failed'))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    const first = setTimeout(reload, 0);
    const timer = refreshMs ? setInterval(reload, refreshMs) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [reload, refreshMs]);

  return { data, error, loading, reload };
}
