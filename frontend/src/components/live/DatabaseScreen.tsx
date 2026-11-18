'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { apiPost, useLive } from '@/services/api';
import { Badge, Card, Kpi, KpiRow, Loadable, Mono, Table, num, shortDate } from './ui';

interface TableInfo {
  name: string; comment: string | null; columns: number; primary_key: string | null;
  foreign_keys: { column: string; references: string }[];
  checks: number; uniques: number; indexes: number; triggers: number; rows: number;
}
interface QueryInfo { key: string; title: string; concept: string; sql: string; role: string | null }
interface Explorer {
  engine: { postgres: string; postgis: string; spatial_indexes: number };
  tables: TableInfo[];
  triggers: { name: string; table_name: string; function: string; timing: string; events: string }[];
  views: { name: string; granted_to: string }[];
  functions: string[];
  roles: string[];
  recent_changes: { id: number; table_name: string; record_id: number; action: string; changed_by: string; changed_at: string }[];
  queries: QueryInfo[];
}
interface QueryResult { key: string; columns: string[]; rows: Record<string, unknown>[]; error: string | null }

const cellText = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function QueryRunner({ queries }: { queries: QueryInfo[] }) {
  const [activeKey, setActiveKey] = useState(queries[0]?.key);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const active = queries.find(q => q.key === activeKey) ?? queries[0];

  const run = async (query: QueryInfo) => {
    setRunning(true);
    setFailure(null);
    try {
      setResult(await apiPost<QueryResult>(`/screens/database/queries/${query.key}`));
    } catch (err) {
      setResult(null);
      setFailure(err instanceof Error ? err.message : 'The query could not run.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card title="Run an example query" right={<Badge tone="cyan">READ ONLY</Badge>}>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <ul className="flex flex-col gap-1.5" aria-label="Example queries">
          {queries.map(q => (
            <li key={q.key}>
              <button
                type="button"
                onClick={() => { setActiveKey(q.key); setResult(null); setFailure(null); }}
                aria-pressed={q.key === active.key}
                className={`w-full rounded-md border px-3 py-2 text-left ${q.key === active.key ? 'border-cyan-400/50 bg-cyan-500/[0.07]' : 'border-[var(--border-bright)] bg-[var(--surface-2)] hover:bg-white/[0.03]'}`}
              >
                <span className="block text-[13px] font-medium text-[var(--foreground)]">{q.title}</span>
                <span className="block text-[11px] text-[var(--fg-dim)]">{q.concept}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-semibold text-[var(--foreground)]">{active.title}</h3>
            {active.role && <Badge tone="amber">AS ROLE roadwatch_{active.role}</Badge>}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => run(active)}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--signal-cyan)] px-3 py-1.5 text-[13px] font-medium text-[#04161a] disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" aria-hidden /> {running ? 'Running…' : 'Run query'}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-md border border-[var(--border-bright)] bg-[var(--surface-2)] p-3 font-mono text-[12px] leading-relaxed text-[var(--foreground)]">{active.sql}</pre>
          {failure && <p role="alert" className="text-[13px] text-[var(--signal-rose)]">{failure}</p>}
          {result?.key === active.key && result.error && (
            <p role="status" className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-200">
              PostgreSQL refused: {result.error}
            </p>
          )}
          {result?.key === active.key && !result.error && (
            <div className="overflow-x-auto rounded-md border border-[var(--border-bright)]">
              <p className="px-3 py-2 text-[12px] text-[var(--fg-dim)]">{result.rows.length} row{result.rows.length === 1 ? '' : 's'} returned</p>
              <Table
                rows={result.rows.map((row, i) => ({ row, i }))}
                rowKey={r => r.i}
                empty="The query returned no rows."
                columns={result.columns.map(column => ({
                  head: column.toUpperCase(),
                  cell: (r: { row: Record<string, unknown> }) => <Mono>{cellText(r.row[column])}</Mono>,
                }))}
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function DatabaseScreen() {
  const state = useLive<Explorer>('/screens/database');
  return (
    <Loadable state={state}>
      {data => {
        const totalRows = data.tables.reduce((sum, t) => sum + t.rows, 0);
        const foreignKeys = data.tables.reduce((sum, t) => sum + t.foreign_keys.length, 0);
        const checks = data.tables.reduce((sum, t) => sum + t.checks, 0);
        return (
          <div className="flex flex-col gap-4">
            <KpiRow>
              <Kpi title="Tables" value={data.tables.length} note={`${num(totalRows)} rows stored`} />
              <Kpi title="Keys and checks" value={foreignKeys} note={`foreign keys · ${checks} CHECK constraints`} tone="indigo" />
              <Kpi title="Triggers" value={data.triggers.length} note={`${data.functions.length} PL/pgSQL functions`} tone="amber" />
              <Kpi title="Views and roles" value={data.views.length} note={`${data.roles.length} database roles`} tone="emerald" />
            </KpiRow>
            <p className="text-[12px] text-[var(--fg-dim)]">
              PostgreSQL {data.engine.postgres} with PostGIS {data.engine.postgis} · {data.engine.spatial_indexes} GiST spatial indexes · every screen in this app reads these tables through the FastAPI backend.
            </p>

            <QueryRunner queries={data.queries} />

            <Card title="Tables" flush right={<Badge>{data.tables.length} TABLES</Badge>}>
                <div className="max-h-[480px] overflow-auto">
                  <Table rows={data.tables} rowKey={t => t.name} columns={[
                    { head: 'TABLE', cell: t => <Mono tone="cyan">{t.name}</Mono> },
                    { head: 'ROWS', cell: t => <Mono>{num(t.rows)}</Mono> },
                    { head: 'COLS', cell: t => <Mono>{t.columns}</Mono> },
                    { head: 'PRIMARY KEY', cell: t => <Mono>{t.primary_key ?? '—'}</Mono> },
                    { head: 'REFERENCES', cell: t => t.foreign_keys.length === 0 ? '—' : (
                      <span className="flex flex-col gap-0.5">
                        {t.foreign_keys.map(fk => <Mono key={fk.column}>{fk.column} → {fk.references}</Mono>)}
                      </span>
                    ) },
                    { head: 'CHECKS', cell: t => <Mono>{t.checks}</Mono> },
                    { head: 'TRIGGERS', cell: t => <Mono>{t.triggers}</Mono> },
                  ]} />
                </div>
            </Card>
            <Card title="Entity relationship diagram">
                <a href="/erd.svg" target="_blank" rel="noreferrer" className="mx-auto block max-w-5xl rounded-md bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/erd.svg" alt="ROADWATCH entity relationship diagram" className="w-full" />
                </a>
                <p className="mt-2 text-center text-[12px] text-[var(--fg-dim)]">Opens full size in a new tab.</p>
            </Card>

            <div className="grid gap-4 2xl:grid-cols-2">
              <Card title="Triggers" flush right={<Badge tone="amber">{data.triggers.length}</Badge>}>
                <div className="max-h-[360px] overflow-auto">
                  <Table rows={data.triggers} rowKey={t => `${t.table_name}.${t.name}`} columns={[
                    { head: 'TRIGGER', cell: t => <Mono>{t.name}</Mono> },
                    { head: 'TABLE', cell: t => <Mono tone="cyan">{t.table_name}</Mono> },
                    { head: 'WHEN', cell: t => <Mono>{t.timing} {t.events || 'TRUNCATE'}</Mono> },
                    { head: 'FUNCTION', cell: t => <Mono>{t.function}()</Mono> },
                  ]} />
                </div>
              </Card>
              <Card title="Views and who may read them" flush>
                <div className="overflow-x-auto"><Table rows={data.views} rowKey={v => v.name} columns={[
                  { head: 'VIEW', cell: v => <Mono tone="cyan">{v.name}</Mono> },
                  { head: 'GRANTED TO', cell: v => v.granted_to ? v.granted_to : <span className="text-[var(--fg-dim)]">owner only</span> },
                ]} /></div>
              </Card>
            </div>

            <Card title="Latest changes recorded by the audit trigger" flush right={<Badge>audit_log</Badge>}>
              <div className="overflow-x-auto"><Table rows={data.recent_changes} rowKey={c => c.id} empty="No changes recorded yet." columns={[
                { head: 'ID', cell: c => <Mono>{c.id}</Mono> },
                { head: 'TABLE', cell: c => <Mono tone="cyan">{c.table_name}</Mono> },
                { head: 'RECORD', cell: c => <Mono>{c.record_id}</Mono> },
                { head: 'ACTION', cell: c => <Badge tone={c.action === 'DELETE' ? 'rose' : c.action === 'INSERT' ? 'emerald' : 'amber'}>{c.action}</Badge> },
                { head: 'BY', cell: c => c.changed_by },
                { head: 'WHEN', cell: c => <Mono>{shortDate(c.changed_at)}</Mono> },
              ]} /></div>
            </Card>
          </div>
        );
      }}
    </Loadable>
  );
}
