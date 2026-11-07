'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Session, apiGet, apiPost } from '@/services/api';

const DEMO_ROLES = [
  ['citizen', 'Citizen'],
  ['engineer', 'Ward engineer'],
  ['admin', 'Administrator'],
  ['auditor', 'Public auditor'],
] as const;

const field = 'w-full rounded-md border border-[var(--border-bright)] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--foreground)]';

export default function LoginDialog() {
  const open = useStore(s => s.loginOpen);
  const setOpen = useStore(s => s.setLoginOpen);
  const setSession = useStore(s => s.setSession);
  const session = useStore(s => s.session);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', residential_ward: '', phone: '' });

  useEffect(() => {
    if (!open) return;
    apiGet<{ enabled: boolean }>('/auth/demo-enabled').then(r => setDemoEnabled(r.enabled)).catch(() => setDemoEnabled(false));
  }, [open]);

  if (!open) return null;

  if (session) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Your account">
        <div className="w-full max-w-sm rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-[var(--foreground)]">{session.user.display_name}</h2>
            <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5 text-[var(--fg-dim)]" aria-hidden /></button>
          </div>
          <p className="mt-1 text-[13px] text-[var(--fg-dim)]">{session.user.email}</p>
          <p className="mt-1 text-[13px] capitalize text-[var(--fg-dim)]">{session.user.role}</p>
          <button
            onClick={() => {
              apiPost('/auth/logout').catch(() => undefined);
              setSession(null);
              setOpen(false);
            }}
            className="mt-4 w-full rounded-md border border-[var(--border-bright)] bg-[var(--surface-3)] px-3 py-2 text-[13px] font-medium text-[var(--foreground)]"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const run = async (call: () => Promise<Session>) => {
    setBusy(true);
    setError(null);
    try {
      setSession(await call());
      setOpen(false);
      setForm({ first_name: '', last_name: '', email: '', password: '', residential_ward: '', phone: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    run(() => mode === 'login'
      ? apiPost<Session>('/auth/login', { email: form.email, password: form.password })
      : apiPost<Session>('/auth/register', {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          residential_ward: form.residential_ward,
          phone_numbers: form.phone ? [form.phone] : [],
        }));
  };

  const input = (name: keyof typeof form, label: string, type = 'text', extra: object = {}) => (
    <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">
      {label}
      <input
        required={name !== 'phone'}
        type={type}
        value={form[name]}
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        className={field}
        {...extra}
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={mode === 'login' ? 'Sign in' : 'Create account'}>
      <div className="max-h-full w-full max-w-sm overflow-y-auto rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-[var(--foreground)]">{mode === 'login' ? 'Sign in' : 'Create a citizen account'}</h2>
          <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5 text-[var(--fg-dim)]" aria-hidden /></button>
        </div>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {input('first_name', 'First name', 'text', { autoComplete: 'given-name' })}
                {input('last_name', 'Last name', 'text', { autoComplete: 'family-name' })}
              </div>
              {input('residential_ward', 'Residential ward')}
              {input('phone', 'Phone (optional)', 'tel', { autoComplete: 'tel' })}
            </>
          )}
          {input('email', 'Email', 'email', { autoComplete: 'email' })}
          {input('password', mode === 'register' ? 'Password (8 characters or more)' : 'Password', 'password', {
            autoComplete: mode === 'login' ? 'current-password' : 'new-password',
            minLength: mode === 'register' ? 8 : undefined,
          })}
          {error && <p role="alert" className="text-xs text-[var(--signal-rose)]">{error}</p>}
          <button disabled={busy} className="rounded-md bg-[var(--signal-cyan)] px-3 py-2 text-[13px] font-medium text-[#04161a] disabled:opacity-50">
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} className="mt-3 text-xs text-[var(--signal-cyan)]">
          {mode === 'login' ? 'New here? Create a citizen account' : 'Already registered? Sign in'}
        </button>
        {demoEnabled && mode === 'login' && (
          <div className="mt-4 border-t border-[var(--border-bright)] pt-3">
            <p className="font-mono text-[10px] tracking-wider text-[var(--fg-dim)]">SAMPLE ACCOUNTS</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DEMO_ROLES.map(([role, label]) => (
                <button
                  key={role}
                  disabled={busy}
                  onClick={() => run(() => apiPost<Session>('/auth/demo-login', { role }))}
                  className="rounded-md border border-[var(--border-bright)] bg-[var(--surface-3)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
