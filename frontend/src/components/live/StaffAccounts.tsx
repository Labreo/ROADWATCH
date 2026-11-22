'use client';

import { FormEvent, useState } from 'react';
import { apiDelete, apiPost, useLive } from '@/services/api';
import { ActionButton, Badge, Card, Loadable, Table, shortDate } from './ui';

interface Account {
  id: number; email: string; display_name: string; role: 'citizen' | 'engineer' | 'admin' | 'auditor';
  authority: string | null; is_demo: boolean; created_at: string;
}
interface Ward { id: number; label: string; department_code: string }

const ROLE_TONE = { citizen: 'slate', engineer: 'cyan', admin: 'amber', auditor: 'indigo' } as const;
const field = 'w-full rounded-md border border-[var(--border-bright)] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--foreground)]';
const EMPTY = { display_name: '', email: '', role: 'engineer', authority_id: '', password: '' };

/** Administrators create and manage engineer, admin and auditor accounts. */
export default function StaffAccounts() {
  const accounts = useLive<Account[]>('/auth/users');
  const wards = useLive<Ward[]>('/auth/wards?region=IN');
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetFor, setResetFor] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiPost('/auth/users', {
        display_name: form.display_name,
        email: form.email,
        role: form.role,
        authority_id: form.role === 'engineer' ? Number(form.authority_id) : null,
        password: form.password,
      });
      setMessage({ ok: true, text: `Account created for ${form.email}. Share the password with them; they can change it after signing in.` });
      setForm(EMPTY);
      accounts.reload();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not create the account.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card title="Accounts" right={<span className="text-xs text-[var(--fg-dim)]">{accounts.data?.length ?? 0} accounts</span>} flush>
        <Loadable state={accounts}>
          {list => (
            <Table
              rows={list}
              rowKey={a => a.id}
              columns={[
                { head: 'Name', cell: a => <div><p className="text-[var(--foreground)]">{a.display_name}</p><p className="text-xs text-[var(--fg-dim)]">{a.email}</p></div> },
                { head: 'Role', cell: a => <Badge tone={ROLE_TONE[a.role]}>{a.role}</Badge> },
                { head: 'Ward', cell: a => a.authority ?? '—' },
                { head: 'Created', cell: a => shortDate(a.created_at) },
                {
                  head: '',
                  cell: a => resetFor === a.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="password" minLength={8} placeholder="New password" value={newPassword}
                        onChange={e => setNewPassword(e.target.value)} className={`${field} w-32 py-1`} aria-label={`New password for ${a.email}`}
                      />
                      <ActionButton
                        variant="primary"
                        disabled={newPassword.length < 8}
                        action={() => apiPost(`/auth/users/${a.id}/password`, { new_password: newPassword })}
                        onDone={() => { setResetFor(null); setNewPassword(''); setMessage({ ok: true, text: `Password reset for ${a.email}. Their old sessions were signed out.` }); }}
                      >
                        Save
                      </ActionButton>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setResetFor(a.id); setNewPassword(''); }} className="rounded border border-[var(--border-bright)] px-2 py-1 text-xs text-[var(--foreground)]">
                        Reset password
                      </button>
                      {a.role !== 'citizen' && !a.is_demo && (
                        <ActionButton variant="danger" action={() => apiDelete(`/auth/users/${a.id}`)} onDone={accounts.reload}>
                          Remove
                        </ActionButton>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Loadable>
      </Card>

      <Card title="Add a staff account">
        <form onSubmit={create} className="flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">
            Full name
            <input required value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">
            Work email
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">
            Role
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={field}>
              <option value="engineer">Ward engineer</option>
              <option value="auditor">Public auditor</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          {form.role === 'engineer' && (
            <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">
              Ward or department
              <select required value={form.authority_id} onChange={e => setForm(f => ({ ...f, authority_id: e.target.value }))} className={field}>
                <option value="" disabled>Choose the ward</option>
                {(wards.data ?? []).map(w => <option key={w.id} value={w.id}>{w.label} ({w.department_code})</option>)}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">
            First password (8 characters or more)
            <input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={field} />
          </label>
          {message && <p role="status" className={`text-xs ${message.ok ? 'text-emerald-400' : 'text-[var(--signal-rose)]'}`}>{message.text}</p>}
          <button disabled={busy} className="rounded-md bg-[var(--signal-cyan)] px-3 py-2 text-[13px] font-medium text-[#04161a] disabled:opacity-50">
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </Card>
    </div>
  );
}
