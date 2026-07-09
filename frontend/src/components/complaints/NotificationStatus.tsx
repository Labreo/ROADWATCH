'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  Bell,
  BellOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Mail,
  Webhook,
  AlertTriangle,
  Info,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationEvent {
  /** Unique identifier for this notification event */
  id: string;
  /** Name of the authority to which the notification was sent */
  authority_name: string;
  /** Category of the notification event */
  event_type:
    | 'complaint.assigned'
    | 'complaint.escalated'
    | 'complaint.resolved'
    | 'complaint.declined'
    | 'sla.breach'
    | 'sla.warning'
    | 'webhook.test'
    | string;
  /** Delivery status */
  status: 'pending' | 'sent' | 'failed';
  /** ISO timestamp of when this notification was created/attempted */
  created_at: string;
  /** HTTP response code from the webhook delivery (only for sent/failed) */
  response_code?: number;
  /** Human-readable error message (only for failed) */
  error_message?: string;
  /** Number of retry attempts so far (only for failed) */
  retry_count?: number;
}

export interface NotificationStatusProps {
  /** Array of notification events to display */
  notifications: NotificationEvent[];
  /** When true, show a compact variant suitable for sidebars */
  compact?: boolean;
  /** Callback fired when the user clicks retry on a single failed notification */
  onRetry?: (notificationId: string) => void;
  /** Callback fired when the user clicks "Retry All Failed" */
  onRetryAll?: () => void;
  /** Maximum number of events to show before collapsing */
  collapseThreshold?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPE_LABELS: Record<string, string> = {
  'complaint.assigned': 'Complaint Assigned',
  'complaint.escalated': 'Complaint Escalated',
  'complaint.resolved': 'Complaint Resolved',
  'complaint.declined': 'Complaint Declined',
  'sla.breach': 'SLA Breach',
  'sla.warning': 'SLA Warning',
  'webhook.test': 'Webhook Test',
};

const EVENT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'complaint.assigned': Mail,
  'complaint.escalated': AlertTriangle,
  'complaint.resolved': CheckCircle2,
  'complaint.declined': XCircle,
  'sla.breach': AlertTriangle,
  'sla.warning': Info,
  'webhook.test': Webhook,
};

// ---------------------------------------------------------------------------
// Status colour tokens
// ---------------------------------------------------------------------------

const STATUS_COLORS = {
  sent: {
    dot: 'border-emerald-500/50 bg-emerald-950/40',
    line: 'bg-emerald-500/30',
    border: 'border-emerald-500/20',
    background: 'bg-emerald-950/10',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
    badge: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
  },
  failed: {
    dot: 'border-rose-500/50 bg-rose-950/40',
    line: 'bg-rose-500/30',
    border: 'border-rose-500/20',
    background: 'bg-rose-950/10',
    text: 'text-rose-400',
    icon: 'text-rose-400',
    badge: 'text-rose-400 border-rose-500/30 bg-rose-950/20',
  },
  pending: {
    dot: 'border-slate-600/50 bg-slate-800/40',
    line: 'bg-slate-700/30',
    border: 'border-slate-700/20',
    background: 'bg-slate-800/10',
    text: 'text-slate-400',
    icon: 'text-slate-500',
    badge: 'text-slate-500 border-slate-700/30 bg-slate-800/20',
  },
} as const;

type StatusKey = keyof typeof STATUS_COLORS;

/** Returns the colour token set for a given status */
function colorsForStatus(status: StatusKey): (typeof STATUS_COLORS)[StatusKey] {
  return STATUS_COLORS[status] ?? STATUS_COLORS.pending;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO string to a human-readable locale string */
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a relative time label (e.g. "2m ago", "1h ago") */
function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Get the friendly label for an event type */
function eventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType.replace(/_/g, ' ').replace(/\./g, ' — ');
}

/** Get the icon component for an event type */
function EventTypeIcon({
  eventType,
  className,
}: {
  eventType: string;
  className?: string;
}) {
  const Icon = EVENT_TYPE_ICONS[eventType] ?? Bell;
  return <Icon className={className} />;
}

// ---------------------------------------------------------------------------
// Summary bar (compact header)
// ---------------------------------------------------------------------------

function SummaryBar({
  total,
  sent,
  failed,
  pending,
  onRetryAll,
  compact,
}: {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  onRetryAll?: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status badges */}
      <div className="flex items-center gap-1.5">
        {sent > 0 && (
          <span className="flex items-center gap-1 text-[8px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 rounded px-1.5 py-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" />
            {sent}
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1 text-[8px] font-mono text-rose-400 bg-rose-950/20 border border-rose-500/20 rounded px-1.5 py-0.5">
            <XCircle className="w-2.5 h-2.5" />
            {failed}
          </span>
        )}
        {pending > 0 && (
          <span className="flex items-center gap-1 text-[8px] font-mono text-slate-400 bg-slate-800/20 border border-slate-700/20 rounded px-1.5 py-0.5">
            <Clock className="w-2.5 h-2.5" />
            {pending}
          </span>
        )}
      </div>

      {/* Retry all failed button */}
      {failed > 0 && onRetryAll && (
        <button
          type="button"
          onClick={onRetryAll}
          className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 rounded px-2 py-0.5"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          Retry All
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationStatus({
  notifications,
  compact = false,
  onRetry,
  onRetryAll,
  collapseThreshold = 5,
}: NotificationStatusProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  // ── Derived statistics ───────────────────────────────────────────────
  const stats = useMemo(() => {
    let sent = 0;
    let failed = 0;
    let pending = 0;
    for (const n of notifications) {
      if (n.status === 'sent') sent++;
      else if (n.status === 'failed') failed++;
      else pending++;
    }
    return { total: notifications.length, sent, failed, pending };
  }, [notifications]);

  // ── Sorted: newest first by created_at, then pending first ──────────
  const sorted = useMemo(() => {
    return [...notifications].sort((a, b) => {
      // Pending items first
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      // Then newest first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notifications]);

  // ── Collapsed slice ─────────────────────────────────────────────────
  const visible = useMemo(() => {
    if (!collapsed || sorted.length <= collapseThreshold) return sorted;
    return sorted.slice(0, collapseThreshold);
  }, [sorted, collapsed, collapseThreshold]);

  const hiddenCount = sorted.length - visible.length;

  // ── Retry handler ───────────────────────────────────────────────────
  const handleRetry = useCallback(
    async (notificationId: string) => {
      if (retrying.has(notificationId) || !onRetry) return;
      setRetrying((prev) => new Set(prev).add(notificationId));
      try {
        await onRetry(notificationId);
      } finally {
        setRetrying((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
      }
    },
    [onRetry, retrying],
  );

  // ── Empty state ─────────────────────────────────────────────────────
  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-slate-900/30 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <BellOff className="w-4 h-4 text-slate-500" />
          <span className="mono-label text-[9px] tracking-wider text-slate-400 font-black uppercase">
            Notifications
          </span>
        </div>

        {/* Empty state body */}
        <div className="flex flex-col items-center justify-center py-8 text-slate-600">
          <BellOff className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-[10px] font-medium">No notification events</p>
          <p className="text-[8px] mt-1 text-slate-700">
            Webhook notifications will appear here when sent.
          </p>
        </div>
      </div>
    );
  }

  // ── Compact variant ─────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="rounded-lg border border-border/60 bg-slate-900/30 p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-1.5">
          <Bell className="w-3 h-3 text-slate-400" />
          <span className="mono-label text-[8px] tracking-wider text-slate-400 font-black uppercase">
            Notifications
          </span>
          <span className="text-[7px] font-mono text-slate-600 ml-auto">
            {stats.total}
          </span>
        </div>

        {/* Summary */}
        <SummaryBar
          total={stats.total}
          sent={stats.sent}
          failed={stats.failed}
          pending={stats.pending}
          onRetryAll={onRetryAll}
          compact
        />

        {/* Latest event preview */}
        {sorted.length > 0 && (
          <div className="pt-1 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  sorted[0].status === 'sent'
                    ? 'bg-emerald-500'
                    : sorted[0].status === 'failed'
                      ? 'bg-rose-500'
                      : 'bg-slate-600'
                }`}
              />
              <span className="text-[8px] text-slate-500 font-mono truncate flex-1">
                {eventTypeLabel(sorted[0].event_type)}
              </span>
              <span className="text-[7px] text-slate-600 font-mono shrink-0">
                {relativeTime(sorted[0].created_at)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Full variant ────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border/60 bg-slate-900/30 p-5 space-y-4">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-slate-400" />
        <span className="mono-label text-[9px] tracking-wider text-slate-400 font-black uppercase">
          Notifications
        </span>
        <span className="text-[8px] font-mono text-slate-600 ml-auto">
          {stats.total} event{stats.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ─── Summary + Retry All ─────────────────────────────────── */}
      <SummaryBar
        total={stats.total}
        sent={stats.sent}
        failed={stats.failed}
        pending={stats.pending}
        onRetryAll={onRetryAll}
      />

      {/* ─── Timeline ────────────────────────────────────────────── */}
      {visible.length > 0 && (
        <div className="relative pl-5 space-y-0">
          {/* Vertical connecting line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-800" />

          {visible.map((event, idx) => {
            const colors = colorsForStatus(event.status as StatusKey);
            const isRetrying = retrying.has(event.id);
            const isLast = idx === visible.length - 1;

            return (
              <div
                key={event.id}
                className="relative pb-5 last:pb-0"
              >
                {/* ── Dot ─────────────────────────────────────────── */}
                <span
                  className={`absolute -left-[17px] top-0.5 w-3 h-3 rounded-full border-2 ${colors.dot} flex items-center justify-center ${
                    event.status === 'pending'
                      ? 'animate-pulse ring-2 ring-offset-1 ring-offset-slate-950 ring-slate-700/30'
                      : ''
                  }`}
                />

                {/* ── Card ────────────────────────────────────────── */}
                <div
                  className={`rounded-lg border p-3 space-y-1.5 transition-all ${
                    colors.border
                  } ${colors.background}`}
                >
                  {/* Title row */}
                  <div className="flex items-center gap-1.5">
                    <EventTypeIcon
                      eventType={event.event_type}
                      className={`w-3.5 h-3.5 shrink-0 ${colors.icon}`}
                    />
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider ${colors.text}`}
                    >
                      {eventTypeLabel(event.event_type)}
                    </span>

                    {/* Status badge */}
                    <span className={`ml-auto text-[7px] font-black px-1 py-0.5 rounded border ${colors.badge}`}>
                      {event.status === 'sent'
                        ? 'Sent'
                        : event.status === 'failed'
                          ? 'Failed'
                          : 'Pending'}
                    </span>
                  </div>

                  {/* Authority name */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400 font-medium">
                      {event.authority_name}
                    </span>
                    {event.response_code && (
                      <span className="text-[7px] font-mono text-slate-600">
                        HTTP {event.response_code}
                      </span>
                    )}
                  </div>

                  {/* Error message (failed only) */}
                  {event.status === 'failed' && event.error_message && (
                    <p className="text-[8px] text-rose-400/80 leading-relaxed bg-rose-950/15 rounded px-2 py-1 border border-rose-500/10">
                      {event.error_message}
                    </p>
                  )}

                  {/* Timestamp + retry */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[7px] font-mono text-slate-600">
                      {formatTimestamp(event.created_at)}
                      {' — '}
                      {relativeTime(event.created_at)}
                    </span>

                    {/* Retry button (failed only) */}
                    {event.status === 'failed' && onRetry && (
                      <button
                        type="button"
                        onClick={() => handleRetry(event.id)}
                        disabled={isRetrying}
                        className="flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 disabled:text-rose-600 disabled:cursor-not-allowed transition-colors"
                      >
                        <RefreshCw
                          className={`w-2.5 h-2.5 ${
                            isRetrying ? 'animate-spin' : ''
                          }`}
                        />
                        {isRetrying ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Collapse / Expand toggle ────────────────────────────── */}
      {sorted.length > collapseThreshold && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
          >
            {collapsed ? (
              <>
                <ChevronDown className="w-3 h-3" />
                Show {hiddenCount} more
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            )}
          </button>
        </div>
      )}

      {/* ─── Footer stats ────────────────────────────────────────── */}
      <div className="border-t border-border/30 pt-3 mt-1 flex items-center justify-between text-[7px] text-slate-600 font-mono">
        <span>
          {stats.sent} sent, {stats.failed} failed, {stats.pending} pending
        </span>
        {stats.failed > 0 && (
          <span className="text-rose-500/70">
            {stats.failed} failed
            {stats.failed === 1 ? ' delivery' : ' deliveries'}
          </span>
        )}
      </div>
    </div>
  );
}