import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, FileSpreadsheet, FileJson, ChevronDown } from 'lucide-react';
import {
  exportToCSV,
  exportToText,
  exportToPDF,
  type ExportMessage,
} from '@/services/exportUtils';

export type ExportFormat = 'csv' | 'text' | 'pdf';

interface ChatExportProps {
  /** The conversation messages to export. */
  messages: ExportMessage[];
  /** Optional per-message ISO timestamps. Defaults to Date.now() per row. */
  timestamps?: string[];
  /** Callback fired after an export action completes. */
  onExport?: (format: ExportFormat) => void;
}

const FORMATS: { key: ExportFormat; label: string; icon: React.ReactNode }[] = [
  {
    key: 'pdf',
    label: 'PDF (Print)',
    icon: <FileJson className="w-3.5 h-3.5" />,
  },
  {
    key: 'csv',
    label: 'CSV',
    icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
  },
  {
    key: 'text',
    label: 'Plain Text',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
];

export default function ChatExport({
  messages,
  timestamps,
  onExport,
}: ChatExportProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    // Delay listener setup so the trigger click itself doesn't immediately close
    const id = requestAnimationFrame(() =>
      document.addEventListener('click', handleClick),
    );
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('click', handleClick);
    };
  }, [open]);

  const handleExport = (format: ExportFormat) => {
    setOpen(false);

    switch (format) {
      case 'csv':
        downloadBlob(
          exportToCSV(messages, timestamps),
          'chat-transcript.csv',
          'text/csv;charset=utf-8',
        );
        break;
      case 'text':
        downloadBlob(
          exportToText(messages, timestamps),
          'chat-transcript.txt',
          'text/plain;charset=utf-8',
        );
        break;
      case 'pdf':
        exportToPDF(messages, 'ROADWATCH AI - Chat Transcript', timestamps);
        break;
    }

    onExport?.(format);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="p-1.5 rounded-lg border border-border/60 hover:border-cyan-500/40 hover:bg-cyan-950/30 text-muted-foreground hover:text-cyan-400 transition-all shrink-0 cursor-pointer flex items-center gap-1"
        aria-label="Export chat"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Download className="w-3.5 h-3.5" />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="export-dropdown"
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="menu"
            aria-label="Export format"
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border border-border/60 bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden py-1"
          >
            {FORMATS.map((fmt) => (
              <button
                key={fmt.key}
                type="button"
                role="menuitem"
                onClick={() => handleExport(fmt.key)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] font-semibold text-slate-300 hover:text-cyan-400 hover:bg-cyan-950/20 transition-all text-left cursor-pointer"
              >
                <span className="text-cyan-500/70 shrink-0">{fmt.icon}</span>
                <span className="flex-1">{fmt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trigger a file download from a string of content. */
function downloadBlob(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}