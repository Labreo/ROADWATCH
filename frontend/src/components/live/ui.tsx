'use client';

import { ReactNode, useState } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { formatCurrency } from '@/services/regionAwareFormat';

export type Tone = 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';

const TONE_TEXT: Record<Tone, string> = {
  cyan: 'text-[var(--signal-cyan)]',
  emerald: 'text-[var(--signal-emerald)]',
  amber: 'text-[var(--signal-amber)]',
  rose: 'text-[var(--signal-rose)]',
  indigo: 'text-[var(--signal-indigo)]',
  slate: 'text-[var(--signal-slate)]',
};

const TONE_BADGE: Record<Tone, string> = {
  cyan: 'bg-cyan-500/10 border-cyan-400/25',
  emerald: 'bg-emerald-500/10 border-emerald-400/25',
  amber: 'bg-amber-500/10 border-amber-400/25',
  rose: 'bg-rose-500/10 border-rose-400/25',
  indigo: 'bg-indigo-500/10 border-indigo-400/25',
  slate: 'bg-slate-500/10 border-slate-400/20',
};

export const STATUS_TONE: Record<string, Tone> = {
  good: 'emerald', fair: 'cyan', poor: 'rose', under_construction: 'amber',
  pending: 'amber', routed: 'indigo', in_progress: 'cyan', resolved: 'emerald', rejected: 'slate',
  completed: 'emerald', planned: 'slate', halted: 'rose', cancelled: 'slate',
  awarded: 'emerald', published: 'cyan', bid_open: 'cyan', under_evaluation: 'amber', draft: 'slate',
  INSERT: 'emerald', UPDATE: 'amber', DELETE: 'rose',
};

export const label = (value: string) => value.replace(/_/g, ' ').toUpperCase();
export const money = (value: number | string | null | undefined) => formatCurrency(Number(value ?? 0), true);
export const num = (value: number | string | null | undefined) => Number(value ?? 0).toLocaleString('en-IN');
export const hours = (value: number | string) => {
  const n = Number(value);
  const abs = Math.abs(n);
  if (abs >= 72) return `${n < 0 ? '-' : ''}${Math.round(abs / 24)}d`;
  const text = abs >= 1 ? `${Math.floor(abs)}h ${Math.round((abs % 1) * 60)}m` : `${Math.round(abs * 60)}m`;
  return n < 0 ? `-${text}` : text;
};
export const shortDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide ${TONE_BADGE[tone]} ${TONE_TEXT[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'slate'}>{label(status)}</Badge>;
}

export function Card({ title, right, children, className = '', flush = false }: {
  title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; flush?: boolean;
}) {
  return (
    <section className={`flex min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border-bright)] px-4 py-3">
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h2>
          {right}
        </header>
      )}
      <div className={flush ? 'min-h-0 flex-1 overflow-auto' : 'min-h-0 flex-1 overflow-auto p-4'}>{children}</div>
    </section>
  );
}

export function Kpi({ title, value, note, tone = 'cyan' }: { title: string; value: ReactNode; note?: ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] px-4 py-3.5">
      <p className="font-mono text-[10px] font-medium tracking-wider text-[var(--fg-dim)]">{title}</p>
      <p className="mt-1.5 text-[26px] font-semibold leading-8 text-[var(--foreground)]">{value}</p>
      {note && <p className={`mt-1 text-xs ${TONE_TEXT[tone]}`}>{note}</p>}
    </div>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{children}</div>;
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: readonly T[]; active: T; onChange: (tab: T) => void }) {
  return (
    <nav role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border-bright)]">
      {tabs.map(tab => (
        <button
          key={tab}
          role="tab"
          aria-selected={tab === active}
          onClick={() => onChange(tab)}
          className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] font-medium ${
            tab === active
              ? 'border-[var(--signal-cyan)] text-[var(--signal-cyan)]'
              : 'border-transparent text-[var(--fg-dim)] hover:text-[var(--foreground)]'
          }`}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}

export interface Column<T> {
  head: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function Table<T>({ columns, rows, rowKey, onRowClick, selected, empty = 'No records yet.' }: {
  columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void; selected?: string | number | null; empty?: string;
}) {
  if (rows.length === 0) return <p className="p-6 text-center text-[13px] text-[var(--fg-dim)]">{empty}</p>;
  return (
    <table className="w-full border-collapse text-left text-[13px]">
      <thead className="sticky top-0 z-10 bg-[var(--surface-2)]">
        <tr>
          {columns.map(col => (
            <th key={col.head} className={`px-4 py-2 font-mono text-[10px] font-medium tracking-wider text-[var(--fg-dim)] ${col.className ?? ''}`}>
              {col.head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const key = rowKey(row);
          return (
            <tr
              key={key}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-t border-[var(--border-bright)] ${onRowClick ? 'cursor-pointer hover:bg-white/[0.03]' : ''} ${selected === key ? 'bg-cyan-500/[0.08]' : ''}`}
            >
              {columns.map(col => (
                <td key={col.head} className={`px-4 py-2.5 align-middle text-[var(--foreground)] ${col.className ?? ''}`}>{col.cell(row)}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Mono({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return <span className={`whitespace-nowrap font-mono text-xs ${tone ? TONE_TEXT[tone] : ''}`}>{children}</span>;
}

/** Runs an API action, showing a busy state and the server's error text. */
export function ActionButton({ children, action, variant = 'secondary', disabled, onDone, className = '' }: {
  children: ReactNode; action: () => Promise<unknown>; variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean; onDone?: () => void; className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = {
    primary: 'bg-[var(--signal-cyan)] text-[#04161a] border-transparent',
    secondary: 'bg-[var(--surface-3)] text-[var(--foreground)] border-[var(--border-bright)]',
    danger: 'bg-rose-500/10 text-[var(--signal-rose)] border-rose-400/40',
  }[variant];
  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={async event => {
          event.stopPropagation();
          setBusy(true);
          setError(null);
          try {
            await action();
            onDone?.();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Action failed');
          } finally {
            setBusy(false);
          }
        }}
        className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-[13px] font-medium disabled:opacity-50 ${styles}`}
      >
        {busy ? 'Working…' : children}
      </button>
      {error && <span role="alert" className="max-w-xs text-[11px] text-[var(--signal-rose)]">{error}</span>}
    </span>
  );
}

export function Loadable<T>({ state, children }: {
  state: { data: T | null; error: string | null; loading: boolean; reload: () => void };
  children: (data: T) => ReactNode;
}) {
  if (state.data) return <>{children(state.data)}</>;
  if (state.error) {
    return (
      <div className="m-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)] p-8 text-center">
        <TriangleAlert className="h-6 w-6 text-[var(--signal-amber)]" aria-hidden />
        <p className="text-sm text-[var(--foreground)]">{state.error}</p>
        <button onClick={state.reload} className="inline-flex items-center gap-2 rounded-md border border-[var(--border-bright)] px-3 py-1.5 text-[13px] text-[var(--foreground)]">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Try again
        </button>
      </div>
    );
  }
  return <p className="p-8 text-center text-sm text-[var(--fg-dim)]">Loading live data…</p>;
}
