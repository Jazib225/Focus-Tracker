import { calculateSessionXp } from './gamification';
import { environmentPresets } from './presets';
import type { SessionState, SessionSummary, SummaryCard } from '../types/focus';

function formatMinutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function buildCards(session: SessionState): SummaryCard[] {
  const cards: SummaryCard[] = [];
  const trackingCoverage = session.durationSeconds === 0
    ? 100
    : Math.round((session.monitoredSeconds / session.durationSeconds) * 100);

  cards.push({
    id: 'score',
    title: session.focusScore >= 85 ? 'Strong focus' : 'Focus could be steadier',
    body: session.focusScore >= 85
      ? 'You stayed focused for most of the tracked session. This setup worked well.'
      : 'Distractions showed up often enough that a shorter or more structured session may help.',
    accent: 'cyan',
    metricLabel: 'Focus score',
    metricValue: `${session.focusScore}%`,
  });

  cards.push({
    id: 'coverage',
    title: trackingCoverage >= 70 ? 'Tracking stayed stable' : 'Tracking dropped at times',
    body: trackingCoverage >= 70
      ? 'The camera stayed active for most of the study session, so the score is based on strong tracking.'
      : 'The timer kept going, but tracking was unreliable at times. Better framing or lighting may help next time.',
    accent: trackingCoverage >= 70 ? 'emerald' : 'amber',
    metricLabel: 'Tracking coverage',
    metricValue: `${trackingCoverage}%`,
  });

  cards.push({
    id: 'streak',
    title: session.longestStreakSeconds < 12 * 60 ? 'Try shorter sessions' : 'Your pacing worked well',
    body: session.longestStreakSeconds < 12 * 60
      ? 'Your longest streak was fairly short, so shorter focus blocks may feel easier to maintain.'
      : 'You held a strong streak for a long stretch. Keep a similar setup for your next study session.',
    accent: session.longestStreakSeconds < 12 * 60 ? 'violet' : 'emerald',
    metricLabel: 'Longest streak',
    metricValue: formatMinutes(session.longestStreakSeconds),
  });

  cards.push({
    id: 'preset',
    title: session.presetId === 'cafe' && session.distractionCount >= 4
      ? 'Try a calmer preset'
      : 'Your preset looks like a good fit',
    body: session.presetId === 'cafe' && session.distractionCount >= 4
      ? 'This session had a high number of distractions. Switching to Library may make tracking feel steadier.'
      : 'Your selected preset matched the session well. Small changes should be enough if you want to adjust it.',
    accent: session.presetId === 'cafe' && session.distractionCount >= 4 ? 'orange' : 'sky',
    metricLabel: 'Preset',
    metricValue: environmentPresets[session.presetId].title,
  });

  if (!session.goal.trim()) {
    cards.push({
      id: 'goal',
      title: 'Add a clearer goal',
      body: 'A short goal makes the study session easier to follow and easier to review afterward.',
      accent: 'fuchsia',
      metricLabel: 'Goal',
      metricValue: 'Missing',
    });
  } else {
    cards.push({
      id: 'goal',
      title: 'Your goal helped',
      body: 'Having a clear goal gave the study session a stronger sense of direction.',
      accent: 'teal',
      metricLabel: 'Session goal',
      metricValue: session.goal,
    });
  }

  return cards.slice(0, 4);
}

export function createSessionSummary(session: SessionState): SessionSummary {
  const endedAt = session.endedAt ?? Date.now();
  const xpEarned = calculateSessionXp({
    focusSeconds: session.focusSeconds,
    pomodoroCyclesCompleted: session.pomodoroCyclesCompleted,
    focusScore: session.focusScore,
    distractionCount: session.distractionCount,
    tabSwitchCount: session.tabSwitchCount,
  });

  const cards = buildCards({
    ...session,
    xpEarned,
  });

  const headline = session.focusScore >= 85
    ? 'This study session went well.'
    : session.focusScore >= 70
    ? 'A solid study session with a few distractions.'
    : 'This study session needs a little more structure next time.';

  const subheadline = session.goal.trim()
    ? `Goal: ${session.goal}`
    : 'Add a clear goal next time so the session has a stronger target.';

  return {
    id: session.id ?? `session-${endedAt}`,
    endedAt,
    goal: session.goal,
    presetId: session.presetId,
    sessionType: session.sessionType,
    durationSeconds: session.durationSeconds,
    focusSeconds: session.focusSeconds,
    monitoredSeconds: session.monitoredSeconds,
    uncertainSeconds: session.uncertainSeconds,
    distractionCount: session.distractionCount,
    tabSwitchCount: session.tabSwitchCount,
    inactivityCount: session.inactivityCount,
    cameraDistractionCount: session.cameraDistractionCount,
    focusScore: session.focusScore,
    longestStreakSeconds: session.longestStreakSeconds,
    currentStreakSeconds: session.currentStreakSeconds,
    xpEarned,
    pomodoroCyclesCompleted: session.pomodoroCyclesCompleted,
    timeline: session.timeline,
    recentEvents: session.recentEvents,
    distractionLog: session.distractionLog,
    cards,
    headline,
    subheadline,
  };
}
