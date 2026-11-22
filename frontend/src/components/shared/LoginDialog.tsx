'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { API_BASE, Session, apiGet, apiPost } from '@/services/api';

const DEMO_ROLES = [
  ['citizen', 'Citizen'],
  ['engineer', 'Ward engineer'],
  ['admin', 'Administrator'],
  ['auditor', 'Public auditor'],
] as const;

const ROLE_LABEL: Record<string, string> = {
  citizen: 'Citizen', engineer: 'Ward engineer', admin: 'Administrator', auditor: 'Public auditor',
};

interface Ward { id: number; label: string; department_code: string }

const field = 'w-full rounded-md border border-[var(--border-bright)] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--foreground)]';
const EMPTY = { first_name: '', last_name: '', email: '', password: '', confirm: '', residential_ward: '', phone: '' };

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function AccountPanel({ session, onClose }: { session: Session; onClose: () => void }) {
  const setSession = useStore(s => s.setSession);
  const [changing, setChanging] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (pw.next !== pw.confirm) {
      setMessage({ ok: false, text: 'The new passwords do not match.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await apiPost('/auth/password', { current_password: pw.current, new_password: pw.next });
      setMessage({ ok: true, text: 'Password changed.' });
      setPw({ current: '', next: '', confirm: '' });
      setChanging(false);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not change the password.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Your account">
      <div className="max-h-full w-full max-w-sm overflow-y-auto rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-[var(--foreground)]">{session.user.display_name}</h2>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-[var(--fg-dim)]" aria-hidden /></button>
        </div>
        <p className="mt-1 text-[13px] text-[var(--fg-dim)]">{session.user.email}</p>
        <p className="mt-1 text-[13px] text-[var(--fg-dim)]">{ROLE_LABEL[session.user.role] ?? session.user.role}</p>

        {message && (
          <p role="status" className={`mt-3 text-xs ${message.ok ? 'text-[var(--signal-emerald,#34d399)]' : 'text-[var(--signal-rose)]'}`}>{message.text}</p>
        )}

        {changing ? (
          <form onSubmit={changePassword} className="mt-4 flex flex-col gap-3">
            {([['current', 'Current password', 'current-password'], ['next', 'New password (8 characters or more)', 'new-password'], ['confirm', 'Repeat new password', 'new-password']] as const).map(([key, label, auto]) => (
              <label key={key} className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">
                {label}
                <input
                  required type="password" autoComplete={auto} minLength={key === 'current' ? undefined : 8}
                  value={pw[key]} onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))} className={field}
                />
              </label>
            ))}
            <div className="flex gap-2">
              <button disabled={busy} className="flex-1 rounded-md bg-[var(--signal-cyan)] px-3 py-2 text-[13px] font-medium text-[#04161a] disabled:opacity-50">
                {busy ? 'Saving…' : 'Save password'}
              </button>
              <button type="button" onClick={() => setChanging(false)} className="rounded-md border border-[var(--border-bright)] px-3 py-2 text-[13px] text-[var(--foreground)]">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => { setChanging(true); setMessage(null); }}
            className="mt-4 w-full rounded-md border border-[var(--border-bright)] px-3 py-2 text-[13px] text-[var(--foreground)]"
          >
            Change password
          </button>
        )}

        <button
          onClick={() => {
            apiPost('/auth/logout').catch(() => undefined);
            setSession(null);
            onClose();
          }}
          className="mt-2 w-full rounded-md border border-[var(--border-bright)] bg-[var(--surface-3)] px-3 py-2 text-[13px] font-medium text-[var(--foreground)]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function LoginDialog() {
  const open = useStore(s => s.loginOpen);
  const setOpen = useStore(s => s.setLoginOpen);
  const setSession = useStore(s => s.setSession);
  const session = useStore(s => s.session);
  const regionCode = useStore(s => s.regionCode);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [wards, setWards] = useState<Ward[]>([]);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    apiGet<{ enabled: boolean }>('/auth/demo-enabled').then(r => setDemoEnabled(r.enabled)).catch(() => setDemoEnabled(false));
    apiGet<{ enabled: boolean }>('/auth/google/enabled').then(r => setGoogleEnabled(r.enabled)).catch(() => setGoogleEnabled(false));
    apiGet<Ward[]>(`/auth/wards?region=${regionCode || 'IN'}`).then(setWards).catch(() => setWards([]));
  }, [open, regionCode]);

  if (!open) return null;
  if (session) return <AccountPanel session={session} onClose={() => setOpen(false)} />;

  const run = async (call: () => Promise<Session>) => {
    setBusy(true);
    setError(null);
    try {
      setSession(await call());
      setOpen(false);
      setForm(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'register' && form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }
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

  const googleSignIn = () => {
    const returnTo = `${window.location.origin}${window.location.pathname}`;
    window.location.href = `${API_BASE}/auth/google/start?return_to=${encodeURIComponent(returnTo)}`;
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

        {googleEnabled && (
          <>
            <button
              onClick={googleSignIn}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border-bright)] bg-white px-3 py-2 text-[13px] font-medium text-[#1f1f1f] disabled:opacity-50"
            >
              <GoogleMark /> {mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
            </button>
            <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
              <span className="h-px flex-1 bg-[var(--border-bright)]" /> or use email <span className="h-px flex-1 bg-[var(--border-bright)]" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {input('first_name', 'First name', 'text', { autoComplete: 'given-name' })}
                {input('last_name', 'Last name', 'text', { autoComplete: 'family-name' })}
              </div>
              <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">
                Your ward
                {wards.length > 0 ? (
                  <select
                    required
                    value={form.residential_ward}
                    onChange={e => setForm(f => ({ ...f, residential_ward: e.target.value }))}
                    className={field}
                  >
                    <option value="" disabled>Choose your ward</option>
                    {wards.map(w => <option key={w.id} value={w.label}>{w.label}</option>)}
                  </select>
                ) : (
                  <input
                    required value={form.residential_ward} className={field} placeholder="e.g. K-West"
                    onChange={e => setForm(f => ({ ...f, residential_ward: e.target.value }))}
                  />
                )}
              </label>
              {input('phone', 'Phone (optional)', 'tel', { autoComplete: 'tel' })}
            </>
          )}
          {input('email', 'Email', 'email', { autoComplete: 'email' })}
          {input('password', mode === 'register' ? 'Password (8 characters or more)' : 'Password', 'password', {
            autoComplete: mode === 'login' ? 'current-password' : 'new-password',
            minLength: mode === 'register' ? 8 : undefined,
          })}
          {mode === 'register' && input('confirm', 'Repeat password', 'password', { autoComplete: 'new-password', minLength: 8 })}
          {error && <p role="alert" className="text-xs text-[var(--signal-rose)]">{error}</p>}
          <button disabled={busy} className="rounded-md bg-[var(--signal-cyan)] px-3 py-2 text-[13px] font-medium text-[#04161a] disabled:opacity-50">
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} className="mt-3 text-xs text-[var(--signal-cyan)]">
          {mode === 'login' ? 'New here? Create a citizen account' : 'Already registered? Sign in'}
        </button>
        {mode === 'login' && (
          <p className="mt-2 text-[11px] text-[var(--fg-dim)]">
            Staff accounts (engineers, auditors) are created by an administrator. Forgot your password? Ask your ward office or an administrator to reset it.
          </p>
        )}
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
