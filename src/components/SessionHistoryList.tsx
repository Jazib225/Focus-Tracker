import { formatDateTime, formatDuration } from '../lib/format';
import type { SessionSummary } from '../types/focus';

interface SessionHistoryListProps {
  history: SessionSummary[];
}

export function SessionHistoryList({ history }: SessionHistoryListProps) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Session History</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Recent runs and outcomes</h3>
      </div>

      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
            No saved sessions yet.
          </div>
        ) : (
          history.map(item => (
            <div key={item.id} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    {formatDateTime(item.endedAt)}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {item.goal || 'Untitled session'}
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-sm text-slate-200">
                  {item.focusScore}% score
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-5">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                  <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Type</span>
                  <span className="mt-2 block font-medium text-white">{item.sessionType}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                  <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Duration</span>
                  <span className="mt-2 block font-medium text-white">{formatDuration(item.durationSeconds)}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                  <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Distractions</span>
                  <span className="mt-2 block font-medium text-white">{item.distractionCount}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                  <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Focus time</span>
                  <span className="mt-2 block font-medium text-white">{formatDuration(item.focusSeconds)}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                  <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">XP</span>
                  <span className="mt-2 block font-medium text-white">{item.xpEarned}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
