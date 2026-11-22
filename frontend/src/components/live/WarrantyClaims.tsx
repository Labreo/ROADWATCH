'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { apiPost, useLive } from '@/services/api';
import { ActionButton, Badge, Card, Kpi, KpiRow, Loadable, Mono, StatusBadge, Table, money, shortDate } from './ui';

interface Claim {
  complaint_id: number; title: string; category: string; status: string; created_at: string;
  road_name: string; road_code: string; project: string; contractor: string; contractor_code: string;
  warranty_type: string; warranty_start_date: string; warranty_end_date: string; claim_count: number;
  estimated_cost: number; authority: string;
}
interface Claims {
  claims: Claim[]; total_amount: number; open_amount: number;
  by_contractor: { contractor: string; claims: number; amount: number }[];
  cost_basis: Record<string, number>;
}
interface Notice { notice: string; drafted_by: string; contractor: string; complaint_id: number }

/** Reports on roads still under a contractor's warranty: repairs the contractor owes, not the city. */
export default function WarrantyClaims() {
  const region = useStore(s => s.regionCode);
  const role = useStore(s => s.userRole);
  const canIssue = role === 'admin' || role === 'engineer';
  const state = useLive<Claims>(`/screens/warranty-claims?region=${region}`);
  const [notice, setNotice] = useState<Notice | null>(null);

  const download = (n: Notice) => {
    const blob = new Blob([n.notice], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `warranty-notice-report-${n.complaint_id}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Loadable state={state}>
      {data => (
        <div className="flex flex-col gap-4">
          <KpiRow>
            <Kpi title="CHARGEABLE TO CONTRACTORS" value={money(data.total_amount)} tone="emerald" note="Estimated repair cost the city should not pay" />
            <Kpi title="STILL OPEN" value={money(data.open_amount)} tone="amber" note="Not yet repaired" />
            <Kpi title="REPORTS UNDER WARRANTY" value={data.claims.length} />
            <Kpi title="CONTRACTORS LIABLE" value={data.by_contractor.length} tone="rose" />
          </KpiRow>

          <Card title="Reports filed while the road was under warranty" flush>
            <Table
              rows={data.claims}
              rowKey={c => c.complaint_id}
              empty="No report falls inside a contractor's warranty period."
              columns={[
                { head: 'Report', cell: c => <div><Mono tone="cyan">#{c.complaint_id}</Mono><p className="text-xs text-[var(--fg-dim)]">{c.title}</p></div> },
                { head: 'Road', cell: c => c.road_name },
                { head: 'Contractor', cell: c => <div>{c.contractor}<p className="text-xs text-[var(--fg-dim)]">{c.project}</p></div> },
                {
                  head: 'Warranty',
                  cell: c => <div><Badge tone="emerald">{c.warranty_type.replace('_', ' ')}</Badge><p className="mt-1 text-xs text-[var(--fg-dim)]">until {shortDate(c.warranty_end_date)}</p></div>,
                },
                { head: 'Filed', cell: c => shortDate(c.created_at) },
                { head: 'Status', cell: c => <StatusBadge status={c.status} /> },
                { head: 'Owed', cell: c => <Mono tone="amber">{money(c.estimated_cost)}</Mono> },
                {
                  head: '',
                  cell: c => canIssue ? (
                    <ActionButton action={async () => setNotice(await apiPost<Notice>(`/screens/warranty-claims/${c.complaint_id}/notice`))} onDone={state.reload}>
                      Draft notice
                    </ActionButton>
                  ) : <span className="text-xs text-[var(--fg-dim)]">{c.claim_count} notices</span>,
                },
              ]}
            />
          </Card>

          <p className="text-xs text-[var(--fg-dim)]">
            Costs are indicative per report ({Object.entries(data.cost_basis).map(([k, v]) => `${k.replace('_', ' ')} ${money(v)}`).join(', ')}).
            A report counts when it was filed between the warranty start and end dates of a project on the same road.
          </p>

          {notice && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Warranty notice">
              <div className="flex max-h-full w-full max-w-2xl flex-col rounded-lg border border-[var(--border-bright)] bg-[var(--surface-1)]">
                <header className="flex items-center justify-between border-b border-[var(--border-bright)] px-5 py-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Notice to {notice.contractor}</h2>
                    <p className="text-xs text-[var(--fg-dim)]">Drafted by {notice.drafted_by === 'template' ? 'the standard template' : `${notice.drafted_by} from database facts only`} · review before sending</p>
                  </div>
                  <button onClick={() => setNotice(null)} className="text-sm text-[var(--fg-dim)]">Close</button>
                </header>
                <pre className="flex-1 overflow-y-auto whitespace-pre-wrap px-5 py-4 font-sans text-[13px] leading-relaxed text-[var(--foreground)]">{notice.notice}</pre>
                <footer className="flex justify-end gap-2 border-t border-[var(--border-bright)] px-5 py-3">
                  <button onClick={() => navigator.clipboard?.writeText(notice.notice)} className="rounded-md border border-[var(--border-bright)] px-3 py-1.5 text-xs text-[var(--foreground)]">Copy</button>
                  <button onClick={() => download(notice)} className="rounded-md bg-[var(--signal-cyan)] px-3 py-1.5 text-xs font-medium text-[#04161a]">Download .txt</button>
                </footer>
              </div>
            </div>
          )}
        </div>
      )}
    </Loadable>
  );
}
