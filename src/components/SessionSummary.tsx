import { CheckCircle, Sparkles } from 'lucide-react';
import { formatDateTime, formatDuration } from '../lib/format';
import type { SessionSummary as SessionSummaryType } from '../types/focus';

interface SessionSummaryProps {
  summary: SessionSummaryType | null;
}

const accentClasses: Record<string, string> = {
  cyan: 'from-cyan-500/25 to-cyan-500/5 border-cyan-400/20',
  amber: 'from-amber-500/25 to-amber-500/5 border-amber-400/20',
  rose: 'from-rose-500/25 to-rose-500/5 border-rose-400/20',
  violet: 'from-violet-500/25 to-violet-500/5 border-violet-400/20',
  emerald: 'from-emerald-500/25 to-emerald-500/5 border-emerald-400/20',
  orange: 'from-orange-500/25 to-orange-500/5 border-orange-400/20',
  sky: 'from-sky-500/25 to-sky-500/5 border-sky-400/20',
  fuchsia: 'from-fuchsia-500/25 to-fuchsia-500/5 border-fuchsia-400/20',
  teal: 'from-teal-500/25 to-teal-500/5 border-teal-400/20',
};

export function SessionSummary({ summary }: SessionSummaryProps) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Session Summary</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Recommendations for your next study session</h3>
        </div>
        {summary && (
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {formatDateTime(summary.endedAt)}
          </div>
        )}
      </div>

      {!summary ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-cyan-300" />
          <p className="mt-4 text-lg font-semibold text-white">No summary yet</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Complete a study session to see your summary here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xl font-semibold text-white">{summary.headline}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">{summary.subheadline}</p>
              </div>
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-right">
                <div className="text-xs uppercase tracking-[0.25em] text-emerald-200">XP earned</div>
                <div className="mt-1 text-2xl font-bold text-white">{summary.xpEarned}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-5">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Duration</div>
                <div className="mt-2 text-2xl font-semibold text-white">{formatDuration(summary.durationSeconds)}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Focus score</div>
                <div className="mt-2 text-2xl font-semibold text-white">{summary.focusScore}%</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Distractions</div>
                <div className="mt-2 text-2xl font-semibold text-white">{summary.distractionCount}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Longest streak</div>
                <div className="mt-2 text-2xl font-semibold text-white">{formatDuration(summary.longestStreakSeconds)}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Tracking coverage</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {summary.durationSeconds === 0
                    ? '0%'
                    : `${Math.round((summary.monitoredSeconds / summary.durationSeconds) * 100)}%`}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {summary.cards.map(card => (
              <div
                key={card.id}
                className={`rounded-[28px] border bg-gradient-to-br ${accentClasses[card.accent] ?? accentClasses.cyan} p-5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-300">{card.metricLabel}</p>
                    <h4 className="mt-2 text-lg font-semibold text-white">{card.title}</h4>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-white">
                    {card.metricValue}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-100/80">{card.body}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5 text-cyan-300" />
              <h4 className="text-lg font-semibold">How these recommendations were chosen</h4>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              <li>Focus score is based on webcam tracking during the study session.</li>
              <li>Tracking coverage shows how much of the session had stable camera tracking.</li>
              <li>The recommendations use your distractions, focus pattern, and session setup.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
