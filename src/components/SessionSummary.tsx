import { CheckCircle, Sparkles, Tag } from 'lucide-react';
import { formatDateTime, formatDuration } from '../lib/format';
import { FocusTimelineChart } from './FocusTimelineChart';
import type { DistractionTag, SessionSummary as SessionSummaryType } from '../types/focus';

interface SessionSummaryProps {
  summary: SessionSummaryType | null;
  mode?: 'panel' | 'modal';
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

const distractionTagLabels: Record<DistractionTag, string> = {
  phone: 'Phone',
  'other-tab': 'Other tab',
  noise: 'Noise',
  'people-nearby': 'People nearby',
  fatigue: 'Fatigue',
  other: 'Other',
  uncategorized: 'Uncategorized',
};

export function SessionSummary({ summary, mode = 'panel' }: SessionSummaryProps) {
  const distractionLog = summary?.distractionLog ?? [];
  const distractionCounts = distractionLog.reduce<Record<DistractionTag, number>>((accumulator, record) => {
    accumulator[record.tag] += 1;
    return accumulator;
  }, {
    phone: 0,
    'other-tab': 0,
    noise: 0,
    'people-nearby': 0,
    fatigue: 0,
    other: 0,
    uncategorized: 0,
  });

  const distractionBreakdown = Object.entries(distractionCounts)
    .map(([tag, count]) => ({
      tag: tag as DistractionTag,
      label: distractionTagLabels[tag as DistractionTag],
      count,
    }))
    .filter(item => item.count > 0)
    .sort((left, right) => right.count - left.count);
  const normalizedBreakdown = distractionBreakdown.length === 0 && summary && summary.distractionCount > 0
    ? [
        {
          tag: 'uncategorized' as const,
          label: distractionTagLabels.uncategorized,
          count: summary.distractionCount,
        },
      ]
    : distractionBreakdown;

  const mostCommonDistraction = normalizedBreakdown[0] ?? null;
  const wrapperClassName = mode === 'panel' ? 'glass-panel p-5' : '';

  const content = !summary ? (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-cyan-300" />
      <p className="mt-4 text-lg font-semibold text-white">No summary yet</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Complete a study session to see your report here.
      </p>
    </div>
  ) : (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-white/10 bg-black/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Session Report</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{summary.headline}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{summary.subheadline}</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {formatDateTime(summary.endedAt)}
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
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-emerald-200">XP earned</div>
            <div className="mt-2 text-2xl font-semibold text-white">{summary.xpEarned}</div>
          </div>
        </div>
      </div>

      <FocusTimelineChart
        summary={summary}
        title="Focus score timeline"
        subtitle="The line shows how your focus score changed over the session. Markers show when distractions were recorded."
        height={340}
      />

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-[30px] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-2 text-white">
            <Tag className="h-5 w-5 text-cyan-300" />
            <h4 className="text-lg font-semibold">Distraction breakdown</h4>
          </div>

          {summary.distractionCount === 0 ? (
            <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center">
              <p className="text-lg font-semibold text-white">No distractions recorded</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                This session stayed clean, so there is nothing to break down here.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/80">Most common</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {mostCommonDistraction ? mostCommonDistraction.label : 'Uncategorized'}
                </p>
                <p className="mt-1 text-sm text-cyan-50/80">
                  {mostCommonDistraction
                    ? `${mostCommonDistraction.count} of ${summary.distractionCount} distractions`
                    : 'No tagged distractions yet.'}
                </p>
              </div>

              <div className="space-y-3">
                {normalizedBreakdown.map(item => {
                  const width = summary.distractionCount === 0
                    ? 0
                    : Math.max(10, Math.round((item.count / summary.distractionCount) * 100));

                  return (
                    <div key={item.tag} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{item.label}</p>
                        <p className="text-sm text-slate-300">{item.count}</p>
                      </div>
                      <div className="mt-3 h-2.5 rounded-full bg-slate-900">
                        <div
                          className="h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-sky-400"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
      </div>

      <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-2 text-white">
          <CheckCircle className="h-5 w-5 text-cyan-300" />
          <h4 className="text-lg font-semibold">How this report was built</h4>
        </div>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
          <li>The focus score reflects webcam tracking during focus time only.</li>
          <li>Distraction markers show when a distraction was recorded during the session.</li>
          <li>Tag breakdown uses the cause you selected after each distraction, or Uncategorized if you skipped it.</li>
        </ul>
      </div>
    </div>
  );

  if (mode === 'modal') {
    return content;
  }

  return <div className={wrapperClassName}>{content}</div>;
}
