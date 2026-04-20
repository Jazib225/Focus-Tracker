import { X } from 'lucide-react';
import { SessionSummary } from './SessionSummary';
import type { SessionSummary as SessionSummaryType } from '../types/focus';

interface SessionReportModalProps {
  summary: SessionSummaryType | null;
  open: boolean;
  onClose: () => void;
}

export function SessionReportModal({ summary, open, onClose }: SessionReportModalProps) {
  if (!open || !summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-slate-950/82 backdrop-blur-md" />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[var(--app-bg)] shadow-[0_40px_160px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">Session Complete</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Your session report is ready.</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Close session report"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <SessionSummary summary={summary} mode="modal" />
        </div>
      </div>
    </div>
  );
}
