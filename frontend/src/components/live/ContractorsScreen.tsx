'use client';

import { useState } from 'react';
import { Ban, Database } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiPost, useLive } from '@/services/api';
import { ActionButton, Badge, Card, Loadable, Mono, Table, money } from './ui';

interface Contractor {
  id: number; contractor_code: string; name: string; rating: number; projects_completed: number; projects_delayed: number;
  performance_index: number; blacklisted: boolean; blacklisted_reason: string | null; license_number: string;
  active_contracts: number; contract_value: number;
}

const indexTone = (v: number) => (v >= 80 ? 'emerald' : v >= 60 ? 'cyan' : v >= 40 ? 'amber' : 'rose');

export default function ContractorsScreen() {
  const region = useStore(s => s.regionCode);
  const role = useStore(s => s.userRole);
  const state = useLive<Contractor[]>(`/screens/contractors?region=${region}`);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  return (
    <Loadable state={state}>
      {firms => {
        const firm = firms.find(f => f.id === selectedId) ?? firms.find(f => f.blacklisted) ?? firms[0];
        return (
          <div className="flex flex-col gap-4">
            <section className="flex items-center gap-3 rounded-lg border border-cyan-400/30 bg-cyan-500/[0.06] px-4 py-2.5">
              <Database className="h-[18px] w-[18px] shrink-0 text-[var(--signal-cyan)]" aria-hidden />
              <div>
                <p className="text-[13px] font-medium text-[var(--foreground)]">Scores update automatically through trg_contractor_perf_index</p>
                <Mono>performance_index = completed ÷ (completed + delayed) × rating × 20</Mono>
              </div>
            </section>
            <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
              <Card title="Contractor registry" flush right={<Mono>Ranked by index</Mono>}>
                <Table
                  rows={firms}
                  rowKey={f => f.id}
                  selected={firm?.id}
                  onRowClick={f => setSelectedId(f.id)}
                  columns={[
                    { head: 'CONTRACTOR', cell: f => <span>{f.name}<br /><Mono>{f.contractor_code}</Mono></span> },
                    { head: 'DONE', cell: f => <Mono>{f.projects_completed}</Mono> },
                    { head: 'LATE', cell: f => <Mono>{f.projects_delayed}</Mono> },
                    { head: 'RATING', cell: f => <Mono>{f.rating}</Mono> },
                    { head: 'INDEX', cell: f => <Mono tone={indexTone(Number(f.performance_index))}>{f.performance_index}</Mono> },
                    { head: 'STANDING', cell: f => <Badge tone={f.blacklisted ? 'rose' : Number(f.performance_index) < 60 ? 'amber' : 'emerald'}>{f.blacklisted ? 'BLACKLISTED' : Number(f.performance_index) < 60 ? 'WATCHLIST' : 'ACTIVE'}</Badge> },
                  ]}
                />
              </Card>
              {firm && (
                <Card title={firm.name} right={firm.blacklisted ? <Badge tone="rose">BLACKLISTED</Badge> : <Badge tone="emerald">ELIGIBLE</Badge>}>
                  <div className="flex flex-col gap-3 text-[13px] text-[var(--foreground)]">
                    {firm.blacklisted && (
                      <p className="flex gap-2 rounded-md bg-rose-500/10 p-3 text-[var(--signal-rose)]">
                        <Ban className="h-4 w-4 shrink-0" aria-hidden />
                        <span>{firm.blacklisted_reason ?? 'No reason recorded.'}</span>
                      </p>
                    )}
                    {[['Code', firm.contractor_code], ['License', firm.license_number], ['Performance index', firm.performance_index], ['Contracts held', firm.active_contracts], ['Contract value', money(firm.contract_value)]].map(([k, v]) => (
                      <p key={String(k)} className="flex justify-between gap-3"><span className="text-[var(--fg-dim)]">{k}</span><span>{v}</span></p>
                    ))}
                    {role === 'admin' && (firm.blacklisted ? (
                      <ActionButton onDone={state.reload} action={() => apiPost(`/screens/contractors/${firm.id}/blacklist`, { blacklisted: false })}>Lift debarment</ActionButton>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <label className="flex flex-col gap-1 text-xs text-[var(--fg-dim)]">Debarment reason
                          <input value={reason} onChange={e => setReason(e.target.value)} className="rounded-md border border-[var(--border-bright)] bg-[var(--surface-2)] px-2 py-1.5 text-[13px] text-[var(--foreground)]" />
                        </label>
                        <ActionButton variant="danger" disabled={!reason.trim()} onDone={() => { setReason(''); state.reload(); }}
                          action={() => apiPost(`/screens/contractors/${firm.id}/blacklist`, { blacklisted: true, reason })}>
                          Blacklist contractor
                        </ActionButton>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        );
      }}
    </Loadable>
  );
}
