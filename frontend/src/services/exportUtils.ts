/**
 * Chat export utilities: CSV, Plain Text, PDF (browser print).
 *
 * The Message shape matches the local interface used in ChatPanel.tsx.
 */
import type { Citation } from '@/components/chat/CitationRenderer';
import type { RoutingDetail } from '@/types';

export interface ExportMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  routingDetails?: RoutingDetail;
  suggestedActions?: { type: string; target_id: number; label: string }[];
  evidence?: { title: string; items: string[] }[];
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * Escape a string for CSV: wrap in double quotes if it contains commas,
 * double-quotes, or newlines; escape embedded double-quotes by doubling them.
 */
function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert an array of messages to CSV text.
 *
 * Columns: role, timestamp, content
 * Timestamp is written as an ISO-8601 string (the message itself does not carry
 * a timestamp, so we use the current time for each row — callers may override
 * by injecting a `_timestamp` prop or passing enriched messages).
 */
export function exportToCSV(
  messages: ExportMessage[],
  timestamps?: string[],
): string {
  const header = 'role,timestamp,content';
  const rows = messages.map((msg, i) => {
    const ts = timestamps?.[i] ?? new Date().toISOString();
    return [csvEscape(msg.role), csvEscape(ts), csvEscape(msg.content)].join(
      ',',
    );
  });
  return [header, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

/**
 * Convert messages to a plain-text transcript.
 *
 * Format:
 *
 *   [USER] 2026-07-09T12:00:00.000Z
 *   Who repaired this road?
 *
 *   [ROADWATCH AI] 2026-07-09T12:00:01.000Z
 *   The most recent repairs were carried out by **Omega Infrastructure Ltd.** ...
 */
export function exportToText(
  messages: ExportMessage[],
  timestamps?: string[],
): string {
  const lines: string[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const ts = timestamps?.[i] ?? new Date().toISOString();
    const label = msg.role === 'user' ? 'USER' : 'ROADWATCH AI';

    lines.push(`[${label}] ${ts}`);
    lines.push(msg.content);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

// ---------------------------------------------------------------------------
// Print-friendly PDF (browser print)
// ---------------------------------------------------------------------------

/**
 * Open a new window with a styled transcript and invoke the browser's native
 * print dialog. The user can then save as PDF via "Save as PDF" / "Print to
 * PDF".
 *
 * This avoids any third-party PDF library and works with the browser print
 * engine which is universally available in all desktop browsers.
 */
export function exportToPDF(
  messages: ExportMessage[],
  title = 'ROADWATCH AI - Chat Transcript',
  timestamps?: string[],
): void {
  // Build HTML content
  const rows = messages
    .map((msg, i) => {
      const ts = timestamps?.[i] ?? new Date().toISOString();
      const sideClass = msg.role === 'user' ? 'user' : 'assistant';
      const label = msg.role === 'user' ? 'You' : 'ROADWATCH AI';
      // Bold markers stripped for PDF readability; newlines become <br>
      const clean = msg.content.replace(/\*\*(.+?)\*\*/g, '$1');
      const body = clean
        .split('\n')
        .filter(Boolean)
        .map((l) => `<p>${l}</p>`)
        .join('');

      return `<div class="message ${sideClass}">
        <div class="meta">${label} &middot; ${ts}</div>
        <div class="bubble">${body}</div>
      </div>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 12px;
    line-height: 1.55;
    color: #1e293b;
    background: #fff;
    padding: 24px;
  }
  h1 { font-size: 18px; margin-bottom: 8px; color: #0f172a; }
  .sub { font-size: 11px; color: #64748b; margin-bottom: 24px; }
  .message { margin-bottom: 16px; }
  .meta { font-size: 10px; color: #94a3b8; margin-bottom: 4px; }
  .bubble {
    border-radius: 8px;
    padding: 10px 14px;
    max-width: 80%;
  }
  .user { text-align: right; }
  .user .bubble {
    background: #e2e8f0;
    display: inline-block;
    text-align: left;
  }
  .assistant .bubble {
    background: #f1f5f9;
    display: inline-block;
    text-align: left;
  }
  p { margin-bottom: 6px; }
  p:last-child { margin-bottom: 0; }
  @media print {
    body { padding: 0; }
    .bubble { break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">${messages.length} message${messages.length !== 1 ? 's' : ''} &middot; ${new Date().toLocaleDateString()}</div>
  ${rows}
  <script>
    window.onload = function () { window.print(); };
  <\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const win = window.open(url, '_blank');
  if (!win) {
    // Browser blocked the popup — fallback: create a temporary iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Clean up after print dialog closes
    const cleanup = () => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    };
    iframe.contentWindow?.addEventListener('afterprint', cleanup);
    // Fallback: remove after 30 s if afterprint never fires
    setTimeout(cleanup, 30_000);
  } else {
    // Popup opened successfully; revoke the blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (c) => map[c] ?? c);
}