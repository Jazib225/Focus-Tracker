import { Award, Flame, Star, Trophy } from 'lucide-react';
import { badgeCatalog } from '../lib/gamification';
import { formatDateTime, formatDuration } from '../lib/format';
import { GamificationPanel } from './GamificationPanel';
import { MetricCard } from './MetricCard';
import type { useSessionEngine } from '../hooks/useSessionEngine';

type DashboardModel = ReturnType<typeof useSessionEngine>;

interface StreaksPageProps {
  model: DashboardModel;
}

export function StreaksPage({ model }: StreaksPageProps) {
  const { persisted, levelProgress } = model;
  const unlockedBadges = persisted.profile.badges.length;
  const badgeUnlockMap = new Map(persisted.profile.badges.map(badge => [badge.id, badge.unlockedAt]));
  const nextBadge = badgeCatalog.find(badge => !persisted.profile.badges.some(unlocked => unlocked.id === badge.id));

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Day Streak"
          value={`${persisted.profile.currentDayStreak}`}
          hint="Consecutive days with at least one completed session."
          icon={<Flame className="h-5 w-5" />}
          tone="amber"
        />
        <MetricCard
          title="Total XP"
          value={`${persisted.profile.totalXp}`}
          hint="Lifetime XP earned from focus sessions."
          icon={<Star className="h-5 w-5" />}
          tone="emerald"
        />
        <MetricCard
          title="Best streak"
          value={formatDuration(persisted.profile.bestFocusStreakSeconds)}
          hint="Longest focus streak recorded in a study session."
          icon={<Trophy className="h-5 w-5" />}
          tone="cyan"
        />
        <MetricCard
          title="Badges"
          value={`${unlockedBadges}/${badgeCatalog.length}`}
          hint="Unlocked milestones and achievements."
          icon={<Award className="h-5 w-5" />}
          tone="violet"
        />
      </section>

      <GamificationPanel
        profile={persisted.profile}
        levelProgress={levelProgress}
        lastSummary={persisted.lastSummary}
      />

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel p-5">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Milestones</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Next goals</h3>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Next level</p>
              <p className="mt-2 text-2xl font-semibold text-white">Lv. {levelProgress.level + 1}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {Math.max(levelProgress.nextLevelXp - levelProgress.intoLevel, 0)} XP to go before the next rank-up.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Next badge</p>
              <p className="mt-2 text-2xl font-semibold text-white">{nextBadge ? nextBadge.name : 'All badges unlocked'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {nextBadge ? nextBadge.description : 'You have earned all available badges.'}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Best session</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {persisted.profile.bestSession ? `${persisted.profile.bestSession.focusScore}%` : 'Waiting'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {persisted.profile.bestSession
                  ? persisted.profile.bestSession.goal || 'No goal was saved for this session.'
                  : 'Complete a strong study session to set a benchmark.'}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Badges</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Earned badges</h3>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {badgeCatalog.map(badge => {
              const unlockedAt = badgeUnlockMap.get(badge.id);
              const unlocked = unlockedAt !== undefined;

              return (
                <div
                  key={badge.id}
                  className={`rounded-[28px] border p-4 transition-all ${
                    unlocked
                      ? 'border-white/10 bg-white/[0.06]'
                      : 'border-dashed border-white/10 bg-white/[0.02] opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`inline-flex rounded-2xl bg-gradient-to-r ${badge.accent} px-3 py-1 text-xs font-semibold text-slate-950`}>
                      {unlocked ? 'Unlocked' : 'Locked'}
                    </div>
                    {unlockedAt && (
                      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                        {formatDateTime(unlockedAt)}
                      </div>
                    )}
                  </div>
                  <h4 className="mt-4 text-lg font-semibold text-white">{badge.name}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{badge.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
