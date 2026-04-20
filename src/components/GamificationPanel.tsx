import { Star, Trophy } from 'lucide-react';
import { formatDateTime, formatDuration } from '../lib/format';
import type { ProfileState, SessionSummary } from '../types/focus';

interface GamificationPanelProps {
  profile: ProfileState;
  levelProgress: {
    level: number;
    intoLevel: number;
    nextLevelXp: number;
    progress: number;
  };
  lastSummary: SessionSummary | null;
}

export function GamificationPanel({
  profile,
  levelProgress,
  lastSummary,
}: GamificationPanelProps) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Progress</p>
          <h3 className="mt-2 text-xl font-semibold text-white">XP, levels, and best session</h3>
        </div>
        <div className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
          {profile.totalXp} XP
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Current level</div>
              <div className="mt-2 text-4xl font-bold text-white">Lv. {levelProgress.level}</div>
            </div>
            <div
              className="grid h-24 w-24 place-items-center rounded-full border border-white/10"
              style={{
                background: `conic-gradient(#34d399 ${levelProgress.progress * 360}deg, rgba(148, 163, 184, 0.12) 0deg)`,
              }}
            >
              <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-950 text-white">
                <Star className="h-7 w-7" />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>Progress to next level</span>
              <span className="font-semibold text-white">
                {levelProgress.intoLevel}/{levelProgress.nextLevelXp}
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                style={{ width: `${Math.max(6, levelProgress.progress * 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Day streak</div>
              <div className="mt-2 text-2xl font-semibold text-white">{profile.currentDayStreak}</div>
              <div className="mt-1 text-sm text-slate-400">Consecutive active days</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Best score</div>
              <div className="mt-2 text-2xl font-semibold text-white">{profile.bestFocusScore}%</div>
              <div className="mt-1 text-sm text-slate-400">Highest focus score</div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <div className="mb-4 flex items-center gap-2 text-white">
            <Trophy className="h-5 w-5 text-cyan-300" />
            <h4 className="text-lg font-semibold">Best session</h4>
          </div>
          {profile.bestSession ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Best result</div>
                <div className="mt-2 text-2xl font-semibold text-white">{profile.bestSession.focusScore}%</div>
                <div className="mt-1 text-sm text-slate-400">
                  {formatDuration(profile.bestSession.durationSeconds)}
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Recorded</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {formatDateTime(profile.bestSession.endedAt)}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {profile.bestSession.goal || 'No goal recorded'}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-400">
              Complete one study session to save your best result.
            </p>
          )}
          {lastSummary && (
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              Your latest study session earned <span className="font-semibold text-white">{lastSummary.xpEarned} XP</span>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
