import type {
  BadgeDefinition,
  BestSessionRecord,
  ProfileState,
  SessionSummary,
  UnlockedBadge,
} from '../types/focus';

export const badgeCatalog: BadgeDefinition[] = [
  {
    id: 'launch',
    name: 'First Session',
    description: 'Complete your first tracked study session.',
    accent: 'from-cyan-400 to-sky-500',
  },
  {
    id: 'laser',
    name: 'High Focus',
    description: 'Finish a study session with a focus score of 90 or higher.',
    accent: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'streak',
    name: 'Long Streak',
    description: 'Reach a 20-minute focus streak in one study session.',
    accent: 'from-orange-400 to-amber-500',
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro Complete',
    description: 'Complete at least three focus blocks in one study session.',
    accent: 'from-fuchsia-400 to-violet-500',
  },
  {
    id: 'marathon',
    name: 'Long Session',
    description: 'Stay in a study session for at least one hour.',
    accent: 'from-indigo-400 to-cyan-500',
  },
  {
    id: 'steady',
    name: 'No Distractions',
    description: 'Finish a study session without any recorded distractions.',
    accent: 'from-rose-400 to-orange-500',
  },
];

export function createDefaultProfile(): ProfileState {
  return {
    totalXp: 0,
    level: 1,
    currentDayStreak: 0,
    totalSessions: 0,
    totalFocusSeconds: 0,
    bestSession: null,
    bestFocusScore: 0,
    bestFocusStreakSeconds: 0,
    bestXpSession: 0,
    badges: [],
    lastSessionDay: null,
  };
}

export function calculateLevel(totalXp: number): number {
  return Math.max(1, Math.floor(totalXp / 120) + 1);
}

export function calculateSessionXp(summary: Pick<
  SessionSummary,
  'focusSeconds' | 'pomodoroCyclesCompleted' | 'focusScore' | 'distractionCount' | 'tabSwitchCount'
>): number {
  const focusXp = Math.round(summary.focusSeconds / 60) * 14;
  const pomodoroXp = summary.pomodoroCyclesCompleted * 30;
  const scoreBonus = Math.round(summary.focusScore * 0.8);
  const disruptionPenalty = summary.distractionCount * 6;
  return Math.max(24, focusXp + pomodoroXp + scoreBonus - disruptionPenalty);
}

function toDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getDayDiff(previousDay: string, currentDay: string): number {
  const prev = new Date(`${previousDay}T00:00:00Z`).getTime();
  const current = new Date(`${currentDay}T00:00:00Z`).getTime();
  return Math.round((current - prev) / 86_400_000);
}

function maybeUpdateBestSession(current: BestSessionRecord | null, summary: SessionSummary): BestSessionRecord {
  if (
    !current ||
    summary.focusScore > current.focusScore ||
    (summary.focusScore === current.focusScore && summary.durationSeconds > current.durationSeconds) ||
    summary.xpEarned > current.xpEarned
  ) {
    return {
      id: summary.id,
      endedAt: summary.endedAt,
      goal: summary.goal,
      focusScore: summary.focusScore,
      durationSeconds: summary.durationSeconds,
      xpEarned: summary.xpEarned,
      longestStreakSeconds: summary.longestStreakSeconds,
      presetId: summary.presetId,
    };
  }

  return current;
}

function unlockBadges(summary: SessionSummary, existing: UnlockedBadge[]): UnlockedBadge[] {
  const owned = new Set(existing.map(badge => badge.id));
  const next = [...existing];
  const unlock = (id: string) => {
    if (!owned.has(id)) {
      owned.add(id);
      next.push({ id, unlockedAt: summary.endedAt });
    }
  };

  unlock('launch');
  if (summary.focusScore >= 90) unlock('laser');
  if (summary.longestStreakSeconds >= 20 * 60) unlock('streak');
  if (summary.pomodoroCyclesCompleted >= 3) unlock('pomodoro');
  if (summary.durationSeconds >= 60 * 60) unlock('marathon');
  if (summary.distractionCount === 0) unlock('steady');

  return next;
}

export function applySummaryToProfile(profile: ProfileState, summary: SessionSummary): ProfileState {
  const dayKey = toDayKey(summary.endedAt);
  let nextDayStreak = 1;

  if (profile.lastSessionDay) {
    const dayDiff = getDayDiff(profile.lastSessionDay, dayKey);
    nextDayStreak = dayDiff === 0 ? profile.currentDayStreak : dayDiff === 1 ? profile.currentDayStreak + 1 : 1;
  }

  const totalXp = profile.totalXp + summary.xpEarned;

  return {
    totalXp,
    level: calculateLevel(totalXp),
    currentDayStreak: nextDayStreak,
    totalSessions: profile.totalSessions + 1,
    totalFocusSeconds: profile.totalFocusSeconds + summary.focusSeconds,
    bestSession: maybeUpdateBestSession(profile.bestSession, summary),
    bestFocusScore: Math.max(profile.bestFocusScore, summary.focusScore),
    bestFocusStreakSeconds: Math.max(profile.bestFocusStreakSeconds, summary.longestStreakSeconds),
    bestXpSession: Math.max(profile.bestXpSession, summary.xpEarned),
    badges: unlockBadges(summary, profile.badges),
    lastSessionDay: dayKey,
  };
}

export function getLevelProgress(totalXp: number): { level: number; intoLevel: number; nextLevelXp: number; progress: number } {
  const level = calculateLevel(totalXp);
  const floorXp = (level - 1) * 120;
  const intoLevel = totalXp - floorXp;
  const nextLevelXp = 120;
  return {
    level,
    intoLevel,
    nextLevelXp,
    progress: Math.min(1, intoLevel / nextLevelXp),
  };
}
