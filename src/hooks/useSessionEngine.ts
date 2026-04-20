import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applySummaryToProfile,
  calculateSessionXp,
  createDefaultProfile,
  getLevelProgress,
} from '../lib/gamification';
import {
  applyPresetToSettings,
  createDefaultSettings,
  createPomodoroState,
  environmentPresets,
} from '../lib/presets';
import { createSessionSummary } from '../lib/summary';
import type {
  ActivityEvent,
  AlertStage,
  DistractionReason,
  EnvironmentPresetId,
  FocusSettings,
  OverlayAlert,
  PendingDistractionOverride,
  PersistedAppState,
  PomodoroPhase,
  PomodoroState,
  SessionState,
  SessionType,
  StreakBreakNotice,
  TimelinePoint,
  TrackingState,
} from '../types/focus';
import { useGazeTracking } from './useGazeTracking';
import { useLocalStorageState } from './useLocalStorageState';

const STORAGE_KEY = 'focus-dashboard-v4';
const BUCKET_SECONDS = 30;
const HISTORY_LIMIT = 12;
const MIN_STREAK_BREAK_THRESHOLD = 1;
const MAX_STREAK_BREAK_THRESHOLD = 5;
const STUDY_TIPS = [
  'Take a breath. You only need to start with the next small step.',
  'Put your phone a little farther away until the next break.',
  'Come back to the easiest part of the task and start there.',
  'Pick one thing to finish before you switch your attention.',
  'You do not need to fix everything right now. Just make a little progress.',
  'Try reading one more paragraph before deciding to stop.',
  'If your mind wandered, that is fine. Just return to the page in front of you.',
  'Shrink the task. What is one part you can do in the next two minutes?',
  'Clear any tabs you do not need for this study session.',
  'If you feel stuck, write down the exact question you are trying to answer.',
  'A quick posture reset can help you settle back in.',
  'Take a sip of water, then come back to the next step.',
  'Give yourself one short stretch of focus before checking anything else.',
  'Start with one problem, one page, or one slide.',
  'You are more likely to keep going once you restart, even briefly.',
  'Put only the materials you need in front of you right now.',
  'Try saying the next idea quietly to yourself, then keep going.',
  'If this feels overwhelming, cut the goal in half and begin there.',
  'Return to the exact line, sentence, or problem where you left off.',
  'A small reset is enough. You do not need a perfect comeback.',
  'If you are tired, focus on one short block instead of forcing a long one.',
  'Lower the noise around you if you can, even for a minute.',
  'Choose one clear target for the next few minutes.',
  'You are doing better by returning than by waiting to feel ready.',
  'If your desk feels cluttered, move one thing out of the way and continue.',
  'Try to finish one clean chunk of work before your next break.',
  'It is okay to restart. That still counts as progress.',
  'Keep going until the timer ends, then reassess.',
  'If your attention keeps slipping, make the next goal smaller and more specific.',
  'You only need to get back on track, not have a perfect session.',
];

interface CameraDistractionOutcome {
  session: SessionState;
  pendingOverride: PendingDistractionOverride;
  stage: AlertStage;
  streakBroken: boolean;
  brokenStreakSeconds: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

function createTimelineBucket(bucket: number): TimelinePoint {
  const bucketEnd = (bucket + 1) * BUCKET_SECONDS;
  return {
    bucket,
    label: formatClock(bucketEnd),
    focusSeconds: 0,
    idleSeconds: 0,
    focusPercent: 0,
    distractions: 0,
    tabSwitches: 0,
    inactivityEvents: 0,
    cameraEvents: 0,
    streakMinutes: 0,
  };
}

function createEmptySession(settings: FocusSettings): SessionState {
  const totalCycles = settings.sessionType === 'pomodoro' ? settings.pomodoroCycles : 1;
  return {
    id: null,
    status: 'idle',
    sessionType: settings.sessionType,
    startedAt: null,
    endedAt: null,
    durationSeconds: 0,
    focusSeconds: 0,
    monitoredSeconds: 0,
    uncertainSeconds: 0,
    distractionCount: 0,
    tabSwitchCount: 0,
    inactivityCount: 0,
    cameraDistractionCount: 0,
    currentStreakSeconds: 0,
    longestStreakSeconds: 0,
    streakBreakThreshold: clampStreakBreakThreshold(settings.streakBreakThreshold),
    streakStrikes: 0,
    focusScore: 100,
    escalationCount: 0,
    goal: settings.goal,
    presetId: settings.presetId,
    timeline: [createTimelineBucket(0)],
    recentEvents: [],
    xpEarned: 0,
    bestFocusRunSeconds: 0,
    lastTickAt: null,
    pomodoroCyclesCompleted: 0,
    currentPhase: 'focus',
    currentCycle: 1,
    totalCycles,
    trackingState: 'inactive',
  };
}

function normalizeSettings(value: unknown): FocusSettings {
  const defaults = createDefaultSettings();
  const candidate = typeof value === 'object' && value !== null ? value as Partial<FocusSettings> : {};

  return {
    ...defaults,
    ...candidate,
    streakBreakThreshold: clampStreakBreakThreshold(candidate.streakBreakThreshold ?? defaults.streakBreakThreshold),
  };
}

function normalizeSessionState(value: unknown, settings: FocusSettings): SessionState {
  const defaults = createEmptySession(settings);
  const candidate = typeof value === 'object' && value !== null ? value as Partial<SessionState> : {};
  const sessionType = candidate.sessionType ?? defaults.sessionType;
  const totalCycles = candidate.totalCycles ?? (sessionType === 'pomodoro' ? settings.pomodoroCycles : 1);
  const streakBreakThreshold = clampStreakBreakThreshold(
    candidate.streakBreakThreshold ?? settings.streakBreakThreshold
  );

  return {
    ...defaults,
    ...candidate,
    sessionType,
    goal: candidate.goal ?? settings.goal,
    presetId: candidate.presetId ?? settings.presetId,
    timeline: Array.isArray(candidate.timeline) && candidate.timeline.length > 0 ? candidate.timeline : defaults.timeline,
    recentEvents: Array.isArray(candidate.recentEvents) ? candidate.recentEvents : [],
    totalCycles,
    streakBreakThreshold,
    streakStrikes: clamp(candidate.streakStrikes ?? 0, 0, streakBreakThreshold),
    trackingState: candidate.trackingState ?? defaults.trackingState,
  };
}

function normalizePersistedState(value: unknown): PersistedAppState {
  const candidate = typeof value === 'object' && value !== null ? value as Partial<PersistedAppState> : {};
  const settings = normalizeSettings(candidate.settings);

  return {
    settings,
    pomodoro: {
      ...createPomodoroState(settings),
      ...(typeof candidate.pomodoro === 'object' && candidate.pomodoro !== null ? candidate.pomodoro : {}),
    },
    profile: {
      ...createDefaultProfile(),
      ...(typeof candidate.profile === 'object' && candidate.profile !== null ? candidate.profile : {}),
    },
    liveSession: normalizeSessionState(candidate.liveSession, settings),
    history: Array.isArray(candidate.history) ? candidate.history : [],
    lastSummary: candidate.lastSummary ?? null,
    pendingDistractionOverride:
      typeof candidate.pendingDistractionOverride === 'object' && candidate.pendingDistractionOverride !== null
        ? candidate.pendingDistractionOverride as PendingDistractionOverride
        : null,
    streakBreakNotice:
      typeof candidate.streakBreakNotice === 'object' && candidate.streakBreakNotice !== null
        ? candidate.streakBreakNotice as StreakBreakNotice
        : null,
  };
}

function createInitialState(): PersistedAppState {
  const settings = createDefaultSettings();
  return {
    settings,
    pomodoro: createPomodoroState(settings),
    profile: createDefaultProfile(),
    liveSession: createEmptySession(settings),
    history: [],
    lastSummary: null,
    pendingDistractionOverride: null,
    streakBreakNotice: null,
  };
}

function getBucketIndex(durationSeconds: number) {
  return Math.floor(Math.max(durationSeconds - 1, 0) / BUCKET_SECONDS);
}

function ensureTimelineBucket(timeline: TimelinePoint[], durationSeconds: number) {
  const bucketIndex = getBucketIndex(durationSeconds);
  const nextTimeline = [...timeline];

  while (nextTimeline.length <= bucketIndex) {
    nextTimeline.push(createTimelineBucket(nextTimeline.length));
  }

  return { nextTimeline, bucketIndex };
}

function calculateFocusScore(session: Pick<SessionState, 'focusSeconds' | 'monitoredSeconds' | 'distractionCount'>) {
  if (session.monitoredSeconds === 0) return 100;
  const focusRatio = session.focusSeconds / session.monitoredSeconds;
  const disruptionPenalty = session.distractionCount * 6;
  return clamp(Math.round(focusRatio * 100 - disruptionPenalty), 18, 100);
}

function clampStreakBreakThreshold(value: number) {
  return clamp(Math.round(value), MIN_STREAK_BREAK_THRESHOLD, MAX_STREAK_BREAK_THRESHOLD);
}

function refreshXp(session: SessionState) {
  return calculateSessionXp({
    focusSeconds: session.focusSeconds,
    pomodoroCyclesCompleted: session.pomodoroCyclesCompleted,
    focusScore: session.focusScore,
    distractionCount: session.distractionCount,
    tabSwitchCount: session.tabSwitchCount,
  });
}

function eventCopy(reason: DistractionReason) {
  switch (reason) {
    case 'camera':
      return {
        label: 'Distraction recorded',
        detail: 'Your eyes were away from the screen long enough to count as a distraction.',
      };
    case 'pomodoro-break':
      return {
        label: 'Pomodoro phase changed',
        detail: 'The timer moved to the next focus or break phase.',
      };
    default:
      return {
        label: 'Session update',
        detail: 'The study session recorded a new event.',
      };
  }
}

function createActivityEvent(reason: DistractionReason, timestamp: number, stage: AlertStage): ActivityEvent {
  const copy = eventCopy(reason);
  return {
    id: `${reason}-${timestamp}`,
    timestamp,
    reason,
    stage,
    label: copy.label,
    detail: copy.detail,
  };
}

function appendActivityEvent(session: SessionState, event: ActivityEvent) {
  return [event, ...session.recentEvents].slice(0, 8);
}

function recordCameraDistraction(session: SessionState, now: number): CameraDistractionOutcome | null {
  if (session.status !== 'active' || session.currentPhase !== 'focus') return null;

  const { nextTimeline, bucketIndex } = ensureTimelineBucket(
    session.timeline,
    Math.max(session.durationSeconds, 1)
  );
  const stage = Math.min(session.escalationCount + 1, 3) as AlertStage;
  const event = createActivityEvent('camera', now, stage);

  nextTimeline[bucketIndex] = {
    ...nextTimeline[bucketIndex],
    distractions: nextTimeline[bucketIndex].distractions + 1,
    cameraEvents: nextTimeline[bucketIndex].cameraEvents + 1,
  };

  const nextStrikeCount = session.streakStrikes + 1;
  const streakBroken = nextStrikeCount >= session.streakBreakThreshold;
  const brokenStreakSeconds = streakBroken ? session.currentStreakSeconds : 0;

  const next = {
    ...session,
    timeline: nextTimeline,
    distractionCount: session.distractionCount + 1,
    cameraDistractionCount: session.cameraDistractionCount + 1,
    currentStreakSeconds: streakBroken ? 0 : session.currentStreakSeconds,
    streakStrikes: streakBroken ? 0 : nextStrikeCount,
    escalationCount: session.escalationCount + 1,
    recentEvents: appendActivityEvent(session, event),
  };

  next.focusScore = calculateFocusScore(next);
  next.xpEarned = refreshXp(next);
  return {
    session: next,
    stage,
    streakBroken: brokenStreakSeconds > 0,
    brokenStreakSeconds,
    pendingOverride: {
      sessionId: session.id ?? `session-${now}`,
      eventId: event.id,
      detectedAt: now,
      bucketIndex,
      previousCurrentStreakSeconds: session.currentStreakSeconds,
      previousStreakStrikes: session.streakStrikes,
      previousEscalationCount: session.escalationCount,
      streakBroken,
    },
  };
}

function createBreakEvent(session: SessionState, timestamp: number) {
  const event = createActivityEvent('pomodoro-break', timestamp, 1);
  return {
    ...session,
    recentEvents: appendActivityEvent(session, event),
  };
}

function buildAlert(stage: AlertStage, reason: DistractionReason): OverlayAlert {
  if (reason === 'pomodoro-break') {
    return {
      stage: 1,
      reason,
      title: 'Phase changed',
      message: 'Your Pomodoro timer moved to the next phase.',
      detail: 'Use the break, then come back ready for the next focus period.',
    };
  }

  if (stage === 1) {
    return {
      stage,
      reason,
      title: 'Refocus',
      message: 'Your eyes moved away from the screen.',
      detail: 'Look back at your work to keep the study session on track.',
    };
  }

  if (stage === 2) {
    return {
      stage,
      reason,
      title: 'Multiple distractions detected',
      message: 'Another distraction was recorded.',
      detail: 'Try adjusting your setup, camera position, or study task before continuing.',
    };
  }

  return {
    stage,
    reason,
    title: 'Take a moment to reset',
    message: 'Several distractions have been recorded in this study session.',
    detail: 'Try a shorter Pomodoro, rewrite your goal, or switch to a calmer preset before continuing.',
  };
}

function pickStudyTips(seed: number, count: number) {
  const maxTips = Math.min(Math.max(count, 1), Math.min(2, STUDY_TIPS.length));
  const tips: string[] = [];
  let index = Math.abs(seed) % STUDY_TIPS.length;
  const step = (Math.floor(seed / 1000) % (STUDY_TIPS.length - 1)) + 1;

  while (tips.length < maxTips) {
    const nextTip = STUDY_TIPS[index];
    if (!tips.includes(nextTip)) {
      tips.push(nextTip);
    }
    index = (index + step) % STUDY_TIPS.length;
  }

  return tips;
}

function buildStreakBreakNotice(brokenStreakSeconds: number, seed: number): StreakBreakNotice {
  const tipCount = brokenStreakSeconds >= 15 * 60 ? 2 : 1;
  return {
    detectedAt: seed,
    brokenStreakSeconds,
    tips: pickStudyTips(seed + brokenStreakSeconds, tipCount),
  };
}

function overrideCameraDistraction(
  session: SessionState,
  pendingOverride: PendingDistractionOverride
) {
  const nextTimeline = [...session.timeline];
  const targetBucket = nextTimeline[pendingOverride.bucketIndex];

  if (targetBucket) {
    nextTimeline[pendingOverride.bucketIndex] = {
      ...targetBucket,
      distractions: Math.max(0, targetBucket.distractions - 1),
      cameraEvents: Math.max(0, targetBucket.cameraEvents - 1),
    };
  }

  const restoredCurrentStreakSeconds = pendingOverride.streakBroken
    ? pendingOverride.previousCurrentStreakSeconds + session.currentStreakSeconds
    : session.currentStreakSeconds;
  const longestStreakSeconds = Math.max(session.longestStreakSeconds, restoredCurrentStreakSeconds);

  const next = {
    ...session,
    timeline: nextTimeline,
    distractionCount: Math.max(0, session.distractionCount - 1),
    cameraDistractionCount: Math.max(0, session.cameraDistractionCount - 1),
    currentStreakSeconds: restoredCurrentStreakSeconds,
    longestStreakSeconds,
    bestFocusRunSeconds: Math.max(session.bestFocusRunSeconds, restoredCurrentStreakSeconds),
    streakStrikes: Math.min(
      pendingOverride.previousStreakStrikes,
      Math.max(session.streakBreakThreshold - 1, 0)
    ),
    escalationCount: Math.min(session.escalationCount, pendingOverride.previousEscalationCount),
    recentEvents: session.recentEvents.filter(event => event.id !== pendingOverride.eventId),
  };

  next.focusScore = calculateFocusScore(next);
  next.xpEarned = refreshXp(next);
  return next;
}

function advanceLiveState(
  session: SessionState,
  pomodoro: PomodoroState,
  now: number,
  trackingState: TrackingState,
  gazeDistracted: boolean
): { session: SessionState; pomodoro: PomodoroState; autoComplete: boolean; phaseChanged: boolean } {
  if (session.status !== 'active') {
    return { session, pomodoro, autoComplete: false, phaseChanged: false };
  }

  const previousTick = session.lastTickAt ?? now;
  const deltaSeconds = Math.max(0, Math.floor((now - previousTick) / 1000));
  if (deltaSeconds === 0) {
    return {
      session: {
        ...session,
        trackingState,
      },
      pomodoro,
      autoComplete: false,
      phaseChanged: false,
    };
  }

  let nextSession: SessionState = {
    ...session,
    timeline: [...session.timeline],
    trackingState,
  };
  let nextPomodoro = { ...pomodoro };
  let autoComplete = false;
  let phaseChanged = false;

  for (let second = 0; second < deltaSeconds; second += 1) {
    const currentPhase: PomodoroPhase = nextSession.sessionType === 'pomodoro'
      ? nextPomodoro.phase
      : 'focus';
    const inFocusPhase = currentPhase === 'focus';
    const reliableTracking = inFocusPhase && trackingState === 'active';
    const focusedThisSecond = reliableTracking && !gazeDistracted;

    const durationSeconds = nextSession.durationSeconds + 1;
    const { nextTimeline, bucketIndex } = ensureTimelineBucket(nextSession.timeline, durationSeconds);
    const bucket = nextTimeline[bucketIndex];

    const monitoredSeconds = nextSession.monitoredSeconds + (reliableTracking ? 1 : 0);
    const focusSeconds = nextSession.focusSeconds + (focusedThisSecond ? 1 : 0);
    const uncertainSeconds = nextSession.uncertainSeconds + (inFocusPhase && !reliableTracking ? 1 : 0);
    const currentStreakSeconds = inFocusPhase
      ? reliableTracking
        ? focusedThisSecond
          ? nextSession.currentStreakSeconds + 1
          : nextSession.currentStreakSeconds
        : nextSession.currentStreakSeconds
      : 0;
    const longestStreakSeconds = Math.max(nextSession.longestStreakSeconds, currentStreakSeconds);

    const updatedBucket: TimelinePoint = {
      ...bucket,
      focusSeconds: bucket.focusSeconds + (focusedThisSecond ? 1 : 0),
      idleSeconds: bucket.idleSeconds + (focusedThisSecond ? 0 : 1),
      focusPercent: 0,
      streakMinutes: Number((currentStreakSeconds / 60).toFixed(1)),
    };
    const bucketTotal = updatedBucket.focusSeconds + updatedBucket.idleSeconds;
    updatedBucket.focusPercent = bucketTotal === 0
      ? 0
      : Math.round((updatedBucket.focusSeconds / bucketTotal) * 100);
    nextTimeline[bucketIndex] = updatedBucket;

    nextSession = {
      ...nextSession,
      durationSeconds,
      focusSeconds,
      monitoredSeconds,
      uncertainSeconds,
      currentStreakSeconds,
      longestStreakSeconds,
      bestFocusRunSeconds: longestStreakSeconds,
      streakStrikes: inFocusPhase ? nextSession.streakStrikes : 0,
      currentPhase,
      currentCycle: nextSession.sessionType === 'pomodoro' ? nextPomodoro.currentCycle : 1,
      totalCycles: nextSession.sessionType === 'pomodoro' ? nextPomodoro.totalCycles : 1,
      timeline: nextTimeline,
    };

    if (nextSession.sessionType === 'pomodoro' && nextPomodoro.isRunning) {
      if (nextPomodoro.remainingSeconds > 1) {
        nextPomodoro = {
          ...nextPomodoro,
          remainingSeconds: nextPomodoro.remainingSeconds - 1,
        };
      } else if (nextPomodoro.phase === 'focus') {
        const completedFocusBlocks = nextPomodoro.completedFocusBlocks + 1;
        const onFinalCycle = completedFocusBlocks >= nextPomodoro.totalCycles;
        nextPomodoro = {
          ...nextPomodoro,
          completedFocusBlocks,
          phase: onFinalCycle ? 'long-break' : 'short-break',
          mode: 'break',
          remainingSeconds: (onFinalCycle ? nextPomodoro.longBreakMinutes : nextPomodoro.shortBreakMinutes) * 60,
        };
        nextSession = {
          ...nextSession,
          pomodoroCyclesCompleted: completedFocusBlocks,
          currentPhase: nextPomodoro.phase,
          currentCycle: nextPomodoro.currentCycle,
          currentStreakSeconds: 0,
          streakStrikes: 0,
        };
        phaseChanged = true;
      } else if (nextPomodoro.phase === 'short-break') {
        nextPomodoro = {
          ...nextPomodoro,
          phase: 'focus',
          mode: 'focus',
          currentCycle: Math.min(nextPomodoro.currentCycle + 1, nextPomodoro.totalCycles),
          remainingSeconds: nextPomodoro.focusMinutes * 60,
        };
        nextSession = {
          ...nextSession,
          currentPhase: 'focus',
          currentCycle: nextPomodoro.currentCycle,
          currentStreakSeconds: 0,
          streakStrikes: 0,
        };
        phaseChanged = true;
      } else {
        nextPomodoro = {
          ...nextPomodoro,
          isRunning: false,
          remainingSeconds: 0,
        };
        autoComplete = true;
        break;
      }
    }
  }

  nextSession.focusScore = calculateFocusScore(nextSession);
  nextSession.xpEarned = refreshXp(nextSession);
  nextSession.lastTickAt = now;

  return {
    session: nextSession,
    pomodoro: nextPomodoro,
    autoComplete,
    phaseChanged,
  };
}

function finalizeSession(previous: PersistedAppState, finishedSession: SessionState): PersistedAppState {
  const summary = createSessionSummary(finishedSession);
  const profile = applySummaryToProfile(previous.profile, summary);

  return {
    ...previous,
    profile,
    history: [summary, ...previous.history].slice(0, HISTORY_LIMIT),
    lastSummary: summary,
    liveSession: createEmptySession(previous.settings),
    pomodoro: {
      ...previous.pomodoro,
      isRunning: false,
      lastUpdatedAt: null,
    },
    pendingDistractionOverride: null,
    streakBreakNotice: null,
  };
}

function playAlertTone(stage: AlertStage) {
  const frequencies = stage === 1 ? [520, 660] : stage === 2 ? [440, 660, 880] : [392, 523, 659, 784];
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    frequencies.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const startAt = ctx.currentTime + index * 0.12;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.12 + stage * 0.05, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.25);
    });
  } catch {
    // Audio is best effort only.
  }
}

export function useSessionEngine() {
  const gaze = useGazeTracking();
  const [persisted, setPersisted] = useLocalStorageState<PersistedAppState>(
    STORAGE_KEY,
    createInitialState,
    normalizePersistedState
  );
  const [toastAlert, setToastAlert] = useState<OverlayAlert | null>(null);
  const [warningAlert, setWarningAlert] = useState<OverlayAlert | null>(null);
  const [modalAlert, setModalAlert] = useState<OverlayAlert | null>(null);
  const [cameraBusy, setCameraBusy] = useState(false);

  const persistedRef = useRef(persisted);
  const cameraDistractionActiveRef = useRef(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    persistedRef.current = persisted;
  }, [persisted]);

  useEffect(() => {
    gaze.setSensitivity(persisted.settings.sensitivity);
    gaze.setAlertDelay(persisted.settings.alertDelay);
    gaze.setAlertSound(false);
    gaze.setAlertFlash(false);
  }, [gaze, persisted.settings.alertDelay, persisted.settings.sensitivity]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
      if (warningTimeoutRef.current !== null) window.clearTimeout(warningTimeoutRef.current);
    };
  }, []);

  const isSessionActive = persisted.liveSession.status === 'active';
  const focusPhaseActive = isSessionActive && persisted.liveSession.currentPhase === 'focus';
  const focusLocked = focusPhaseActive && gaze.trackingState === 'active' && !gaze.isDistracted;

  const showOverlay = useCallback((stage: AlertStage, reason: DistractionReason) => {
    const alert = buildAlert(stage, reason);
    if (persistedRef.current.settings.alertSound) {
      playAlertTone(stage);
    }

    if (stage === 1) {
      setToastAlert(alert);
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = window.setTimeout(() => setToastAlert(null), 3600);
      return;
    }

    if (stage === 2) {
      setWarningAlert(alert);
      if (warningTimeoutRef.current !== null) window.clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = window.setTimeout(() => setWarningAlert(null), 4500);
      return;
    }

    setModalAlert(alert);
  }, []);

  const showPomodoroToast = useCallback(() => {
    const alert = buildAlert(1, 'pomodoro-break');
    setToastAlert(alert);
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastAlert(null), 3200);
    if (persistedRef.current.settings.alertSound) {
      playAlertTone(1);
    }
  }, []);

  const emitCameraDistraction = useCallback(() => {
    const current = persistedRef.current;
    if (current.liveSession.status !== 'active' || current.liveSession.currentPhase !== 'focus') return;
    const now = Date.now();
    const previewOutcome = recordCameraDistraction(current.liveSession, now);
    if (!previewOutcome) return;

    if (previewOutcome.streakBroken) {
      setToastAlert(null);
      setWarningAlert(null);
      setModalAlert(null);
    } else {
      showOverlay(previewOutcome.stage, 'camera');
    }

    setPersisted(previous => {
      if (previous.liveSession.status !== 'active' || previous.liveSession.currentPhase !== 'focus') {
        return previous;
      }
      const outcome = recordCameraDistraction(previous.liveSession, now);
      if (!outcome) return previous;

      return {
        ...previous,
        liveSession: outcome.session,
        pendingDistractionOverride: outcome.pendingOverride,
        streakBreakNotice: outcome.streakBroken
          ? buildStreakBreakNotice(outcome.brokenStreakSeconds, now)
          : null,
      };
    });
  }, [setPersisted, showOverlay]);

  useEffect(() => {
    const shouldIgnoreCameraAlerts =
      persisted.liveSession.status !== 'active' ||
      persisted.liveSession.currentPhase !== 'focus' ||
      gaze.trackingState !== 'active';

    if (shouldIgnoreCameraAlerts) {
      cameraDistractionActiveRef.current = false;
      if (gaze.isDistracted) {
        gaze.dismissAlert();
      }
      return;
    }

    if (gaze.isDistracted && !cameraDistractionActiveRef.current) {
      cameraDistractionActiveRef.current = true;
      emitCameraDistraction();
    }

    if (!gaze.isDistracted) {
      cameraDistractionActiveRef.current = false;
    }
  }, [
    emitCameraDistraction,
    gaze,
    gaze.isDistracted,
    gaze.trackingState,
    persisted.liveSession.currentPhase,
    persisted.liveSession.status,
  ]);

  useEffect(() => {
    if (persisted.liveSession.status !== 'active') return;

    const interval = window.setInterval(() => {
      setPersisted(previous => {
        if (previous.liveSession.status !== 'active') return previous;

        const now = Date.now();
        const advanced = advanceLiveState(
          previous.liveSession,
          previous.pomodoro,
          now,
          gaze.trackingState,
          gaze.isDistracted
        );

        const nextSession = {
          ...advanced.session,
          trackingState: gaze.trackingState,
        };
        const nextState = {
          ...previous,
          liveSession: advanced.phaseChanged ? createBreakEvent(nextSession, now) : nextSession,
          pomodoro: {
            ...advanced.pomodoro,
            lastUpdatedAt: now,
          },
        };

        if (advanced.phaseChanged) {
          showPomodoroToast();
        }

        if (advanced.autoComplete) {
          return finalizeSession(nextState, {
            ...nextState.liveSession,
            status: 'complete',
            endedAt: now,
            lastTickAt: now,
          });
        }

        return nextState;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [gaze.isDistracted, gaze.trackingState, persisted.liveSession.status, setPersisted, showPomodoroToast]);

  const applyEnvironmentPreset = useCallback((presetId: EnvironmentPresetId) => {
    setPersisted(previous => {
      const settings = applyPresetToSettings(presetId, previous.settings);
      return {
        ...previous,
        settings,
        liveSession: previous.liveSession.status === 'active'
          ? {
              ...previous.liveSession,
              presetId,
              goal: settings.goal,
            }
          : previous.liveSession,
      };
    });
  }, [setPersisted]);

  const updateGoal = useCallback((goal: string) => {
    setPersisted(previous => ({
      ...previous,
      settings: {
        ...previous.settings,
        goal,
      },
      liveSession: previous.liveSession.status === 'active'
        ? {
            ...previous.liveSession,
            goal,
          }
        : previous.liveSession,
    }));
  }, [setPersisted]);

  const updateSessionType = useCallback((sessionType: SessionType) => {
    setPersisted(previous => ({
      ...previous,
      settings: {
        ...previous.settings,
        sessionType,
      },
    }));
  }, [setPersisted]);

  const updatePomodoroConfig = useCallback((
    field: 'focus' | 'shortBreak' | 'longBreak' | 'cycles',
    value: number
  ) => {
    setPersisted(previous => {
      const nextSettings: FocusSettings = {
        ...previous.settings,
        pomodoroPresetId: 'custom',
        pomodoroFocusMinutes: field === 'focus' ? value : previous.settings.pomodoroFocusMinutes,
        pomodoroShortBreakMinutes: field === 'shortBreak' ? value : previous.settings.pomodoroShortBreakMinutes,
        pomodoroLongBreakMinutes: field === 'longBreak' ? value : previous.settings.pomodoroLongBreakMinutes,
        pomodoroCycles: field === 'cycles' ? value : previous.settings.pomodoroCycles,
        customFocusMinutes: field === 'focus' ? value : previous.settings.customFocusMinutes,
        customBreakMinutes: field === 'shortBreak' ? value : previous.settings.customBreakMinutes,
      };

      return {
        ...previous,
        settings: nextSettings,
        pomodoro: previous.liveSession.status === 'active'
          ? previous.pomodoro
          : createPomodoroState(nextSettings),
      };
    });
  }, [setPersisted]);

  const updateSensitivity = useCallback((sensitivity: number) => {
    setPersisted(previous => ({
      ...previous,
      settings: {
        ...previous.settings,
        sensitivity,
      },
    }));
  }, [setPersisted]);

  const updateAlertDelay = useCallback((alertDelay: number) => {
    setPersisted(previous => ({
      ...previous,
      settings: {
        ...previous.settings,
        alertDelay,
      },
    }));
  }, [setPersisted]);

  const updateStreakBreakThreshold = useCallback((value: number) => {
    const streakBreakThreshold = clampStreakBreakThreshold(value);

    setPersisted(previous => {
      const liveSession = previous.liveSession.status === 'active'
        ? (() => {
            const adjustedStrikes = Math.min(previous.liveSession.streakStrikes, streakBreakThreshold);
            const shouldBreakNow = adjustedStrikes >= streakBreakThreshold;

            return {
              ...previous.liveSession,
              streakBreakThreshold,
              streakStrikes: shouldBreakNow ? 0 : adjustedStrikes,
              currentStreakSeconds: shouldBreakNow ? 0 : previous.liveSession.currentStreakSeconds,
            };
          })()
        : previous.liveSession;

      return {
        ...previous,
        settings: {
          ...previous.settings,
          streakBreakThreshold,
        },
        liveSession,
      };
    });
  }, [setPersisted]);

  const toggleAlertSound = useCallback((alertSound: boolean) => {
    setPersisted(previous => ({
      ...previous,
      settings: {
        ...previous.settings,
        alertSound,
      },
    }));
  }, [setPersisted]);

  const toggleAlertFlash = useCallback((alertFlash: boolean) => {
    setPersisted(previous => ({
      ...previous,
      settings: {
        ...previous.settings,
        alertFlash,
      },
    }));
  }, [setPersisted]);

  const startSession = useCallback(async () => {
    const now = Date.now();

    setToastAlert(null);
    setWarningAlert(null);
    setModalAlert(null);
    cameraDistractionActiveRef.current = false;

    setPersisted(previous => {
      const liveSession = {
        ...createEmptySession(previous.settings),
        id: `session-${now}`,
        status: 'active' as const,
        sessionType: previous.settings.sessionType,
        startedAt: now,
        lastTickAt: now,
        goal: previous.settings.goal,
        presetId: previous.settings.presetId,
        trackingState: gaze.trackingState,
      };

      const pomodoro = createPomodoroState(previous.settings);
      return {
        ...previous,
        liveSession: {
          ...liveSession,
          currentPhase: previous.settings.sessionType === 'pomodoro' ? pomodoro.phase : 'focus',
          currentCycle: previous.settings.sessionType === 'pomodoro' ? pomodoro.currentCycle : 1,
          totalCycles: previous.settings.sessionType === 'pomodoro' ? pomodoro.totalCycles : 1,
        },
        pomodoro: {
          ...pomodoro,
          isRunning: previous.settings.sessionType === 'pomodoro',
          lastUpdatedAt: now,
        },
        pendingDistractionOverride: null,
        streakBreakNotice: null,
      };
    });

    if (!gaze.isTracking) {
      setCameraBusy(true);
      try {
        await gaze.startTracking();
      } finally {
        setCameraBusy(false);
      }
    }
  }, [gaze, setPersisted]);

  const endSession = useCallback(() => {
    const now = Date.now();
    setPersisted(previous => {
      if (previous.liveSession.status !== 'active') return previous;

      const advanced = advanceLiveState(
        previous.liveSession,
        previous.pomodoro,
        now,
        gaze.trackingState,
        gaze.isDistracted
      );

      return finalizeSession(
        {
          ...previous,
          pomodoro: {
            ...advanced.pomodoro,
            isRunning: false,
            lastUpdatedAt: now,
          },
        },
        {
          ...advanced.session,
          trackingState: gaze.trackingState,
          status: 'complete',
          endedAt: now,
          lastTickAt: now,
        }
      );
    });

    setToastAlert(null);
    setWarningAlert(null);
    setModalAlert(null);
  }, [gaze.isDistracted, gaze.trackingState, setPersisted]);

  const resetEscalation = useCallback(() => {
    setModalAlert(null);
    setWarningAlert(null);
    setToastAlert(null);
    setPersisted(previous => ({
      ...previous,
      liveSession: previous.liveSession.status === 'active'
        ? {
            ...previous.liveSession,
            escalationCount: 0,
          }
        : previous.liveSession,
    }));
  }, [setPersisted]);

  const startCamera = useCallback(async () => {
    setCameraBusy(true);
    try {
      await gaze.startTracking();
    } finally {
      setCameraBusy(false);
    }
  }, [gaze]);

  const stopCamera = useCallback(() => {
    gaze.stopTracking();
    cameraDistractionActiveRef.current = false;
  }, [gaze]);

  const dismissToast = useCallback(() => setToastAlert(null), []);
  const dismissWarning = useCallback(() => setWarningAlert(null), []);
  const dismissModal = useCallback(() => setModalAlert(null), []);
  const dismissStreakBreakNotice = useCallback(() => {
    setPersisted(previous => ({
      ...previous,
      streakBreakNotice: null,
    }));
  }, [setPersisted]);

  const overrideLastDistraction = useCallback(() => {
    setToastAlert(null);
    setWarningAlert(null);
    setModalAlert(null);
    gaze.dismissAlert();
    cameraDistractionActiveRef.current = false;

    setPersisted(previous => {
      const pendingOverride = previous.pendingDistractionOverride;
      if (!pendingOverride) {
        return {
          ...previous,
          streakBreakNotice: null,
        };
      }

      const sameSession =
        previous.liveSession.status === 'active' &&
        previous.liveSession.id === pendingOverride.sessionId &&
        previous.liveSession.currentPhase === 'focus';

      if (!sameSession) {
        return {
          ...previous,
          pendingDistractionOverride: null,
          streakBreakNotice: null,
        };
      }

      return {
        ...previous,
        liveSession: overrideCameraDistraction(previous.liveSession, pendingOverride),
        pendingDistractionOverride: null,
        streakBreakNotice: null,
      };
    });
  }, [gaze, setPersisted]);

  const levelProgress = useMemo(
    () => getLevelProgress(persisted.profile.totalXp),
    [persisted.profile.totalXp]
  );

  const environmentPreset = environmentPresets[persisted.settings.presetId];
  const currentTimerSeconds = isSessionActive
    ? persisted.liveSession.sessionType === 'pomodoro'
      ? persisted.pomodoro.remainingSeconds
      : persisted.liveSession.durationSeconds
    : persisted.settings.sessionType === 'pomodoro'
    ? persisted.settings.pomodoroFocusMinutes * 60
    : 0;
  const trackingCoverage = persisted.liveSession.durationSeconds > 0
    ? Math.round((persisted.liveSession.monitoredSeconds / persisted.liveSession.durationSeconds) * 100)
    : 0;
  const canOverrideLastDistraction =
    persisted.pendingDistractionOverride !== null &&
    persisted.liveSession.status === 'active' &&
    persisted.liveSession.id === persisted.pendingDistractionOverride.sessionId &&
    persisted.liveSession.currentPhase === 'focus';

  return {
    gaze,
    persisted,
    environmentPreset,
    levelProgress,
    isSessionActive,
    focusPhaseActive,
    focusLocked,
    cameraBusy,
    currentTimerSeconds,
    trackingCoverage,
    toastAlert,
    warningAlert,
    modalAlert,
    canOverrideLastDistraction,
    actions: {
      startSession,
      endSession,
      resetEscalation,
      dismissToast,
      dismissWarning,
      dismissModal,
      dismissStreakBreakNotice,
      overrideLastDistraction,
      applyEnvironmentPreset,
      updateGoal,
      updateSessionType,
      updatePomodoroConfig,
      updateSensitivity,
      updateAlertDelay,
      updateStreakBreakThreshold,
      toggleAlertSound,
      toggleAlertFlash,
      startCamera,
      stopCamera,
    },
  };
}
