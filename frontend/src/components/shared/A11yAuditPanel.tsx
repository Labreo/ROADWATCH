'use client';

import { useState, useCallback } from 'react';
import { runA11yAudit, type AuditReport, type AuditFinding } from '@/services/a11yAudit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityBadge(severity: AuditFinding['severity']): string {
  switch (severity) {
    case 'fail':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'warning':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'pass':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  }
}

const severityLabel: Record<AuditFinding['severity'], string> = {
  fail: 'FAIL',
  warning: 'WARN',
  pass: 'PASS',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FindingItem({ finding }: { finding: AuditFinding }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
        aria-expanded={expanded}
      >
        <span
          className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border ${severityBadge(finding.severity)}`}
        >
          {severityLabel[finding.severity]}
        </span>
        <span className="text-[11px] text-slate-300 flex-1 leading-snug">{finding.message}</span>
        <svg
          className={`shrink-0 mt-0.5 w-3 h-3 text-[#55555f] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {finding.wcag && (
            <p className="text-[10px] font-medium text-cyan-400">{finding.wcag}</p>
          )}
          <p className="text-[10px] text-[#55555f] font-mono">{finding.rule}</p>
          {finding.selector && (
            <p className="text-[10px] text-[#55555f] font-mono">
              Selector: <span className="text-slate-400">{finding.selector}</span>
            </p>
          )}
          {finding.snippet && (
            <pre className="text-[9px] text-[#888] font-mono bg-black/40 rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
              {finding.snippet}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function CountBadge({ count, label, className }: { count: number; label: string; className: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${className}`}>
      <span className="text-[13px] font-bold">{count}</span>
      <span className="text-[9px] font-semibold uppercase">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export default function A11yAuditPanel() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [running, setRunning] = useState(false);

  const handleRunAudit = useCallback(() => {
    setRunning(true);
    // Yield to the main thread so the UI updates before the (sync) scan
    requestAnimationFrame(() => {
      const result = runA11yAudit();
      setReport(result);
      setRunning(false);
    });
  }, []);

  return (
    <div
      role="region"
      aria-label="Accessibility audit"
      className="glass-depth-2 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.12em]">
          a11y Audit
        </h3>
        <button
          onClick={handleRunAudit}
          disabled={running}
          className="px-2.5 py-1 rounded-lg text-[9px] font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {running ? 'Scanning...' : 'Run Audit'}
        </button>
      </div>

      {/* Summary badges */}
      {report && (
        <div className="flex gap-2 px-4 pb-3">
          <CountBadge
            count={report.total}
            label="Total"
            className="border-white/[0.06] bg-white/[0.03] text-slate-300"
          />
          <CountBadge
            count={report.pass}
            label="Pass"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          />
          <CountBadge
            count={report.fail}
            label="Fail"
            className="border-red-500/30 bg-red-500/10 text-red-400"
          />
          <CountBadge
            count={report.warning}
            label="Warn"
            className="border-amber-500/30 bg-amber-500/10 text-amber-400"
          />
        </div>
      )}

      {/* Findings list */}
      {report && report.findings.length > 0 && (
        <div className="max-h-80 overflow-y-auto">
          {/* Failures first, then warnings, then passes */}
          {(['fail', 'warning', 'pass'] as AuditFinding['severity'][]).map((sev) => {
            const items = report.findings.filter((f) => f.severity === sev);
            if (items.length === 0) return null;
            return items.map((finding, i) => (
              <FindingItem key={`${sev}-${i}`} finding={finding} />
            ));
          })}
        </div>
      )}

      {/* Empty state */}
      {report && report.findings.length === 0 && (
        <div className="px-4 pb-4">
          <p className="text-[11px] text-emerald-400 font-semibold">
            No issues detected. The page passes all automated checks.
          </p>
        </div>
      )}

      {/* Idle prompt */}
      {!report && !running && (
        <div className="px-4 pb-4">
          <p className="text-[10px] text-[#55555f]">
            Click &quot;Run Audit&quot; to scan the page for WCAG violations.
          </p>
        </div>
      )}
    </div>
  );
}