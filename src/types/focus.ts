export type EnvironmentPresetId = 'dorm' | 'library' | 'cafe';
export type PomodoroPresetId = 'sprint' | 'classic' | 'deep' | 'custom';
export type AlertStage = 0 | 1 | 2 | 3;
export type SessionStatus = 'idle' | 'active' | 'complete';
export type SessionType = 'standard' | 'pomodoro';
export type PomodoroMode = 'focus' | 'break';
export type PomodoroPhase = 'focus' | 'short-break' | 'long-break';
export type TrackingState = 'inactive' | 'calibrating' | 'active' | 'uncertain';
export type DistractionReason = 'camera' | 'tab-switch' | 'inactivity' | 'pomodoro-break';
export type DistractionTag =
  | 'phone'
  | 'other-tab'
  | 'noise'
  | 'people-nearby'
  | 'fatigue'
  | 'other'
  | 'uncategorized';

export interface EnvironmentPresetDefinition {
  id: EnvironmentPresetId;
  title: string;
  tagline: string;
  description: string;
  sensitivity: number;
  alertDelay: number;
  alertSound: boolean;
  alertFlash: boolean;
  accent: string;
}

export interface PomodoroPresetDefinition {
  id: PomodoroPresetId;
  label: string;
  description: string;
  focusMinutes: number;
  breakMinutes: number;
}

export interface FocusSettings {
  presetId: EnvironmentPresetId;
  sensitivity: number;
  alertDelay: number;
  alertSound: boolean;
  alertFlash: boolean;
  streakBreakThreshold: number;
  goal: string;
  sessionType: SessionType;
  pomodoroPresetId: PomodoroPresetId;
  pomodoroFocusMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  pomodoroCycles: number;
  customFocusMinutes: number;
  customBreakMinutes: number;
  autoStartBreak: boolean;
}

export interface PomodoroState {
  presetId: PomodoroPresetId;
  focusMinutes: number;
  breakMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  mode: PomodoroMode;
  phase: PomodoroPhase;
  remainingSeconds: number;
  isRunning: boolean;
  completedFocusBlocks: number;
  currentCycle: number;
  totalCycles: number;
  lastUpdatedAt: number | null;
}

export interface TimelinePoint {
  bucket: number;
  label: string;
  focusSeconds: number;
  monitoredSeconds: number;
  idleSeconds: number;
  focusPercent: number;
  distractions: number;
  tabSwitches: number;
  inactivityEvents: number;
  cameraEvents: number;
  streakMinutes: number;
  focusPhaseSeconds: number;
  breakPhaseSeconds: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: number;
  reason: DistractionReason;
  stage: AlertStage;
  label: string;
  detail: string;
  tag?: DistractionTag;
}

export interface DistractionRecord {
  id: string;
  timestamp: number;
  stage: AlertStage;
  bucketIndex: number;
  phase: PomodoroPhase;
  tag: DistractionTag;
}

export interface SessionState {
  id: string | null;
  status: SessionStatus;
  sessionType: SessionType;
  startedAt: number | null;
  endedAt: number | null;
  durationSeconds: number;
  focusSeconds: number;
  monitoredSeconds: number;
  uncertainSeconds: number;
  distractionCount: number;
  tabSwitchCount: number;
  inactivityCount: number;
  cameraDistractionCount: number;
  currentStreakSeconds: number;
  longestStreakSeconds: number;
  streakBreakThreshold: number;
  streakStrikes: number;
  focusScore: number;
  escalationCount: number;
  goal: string;
  presetId: EnvironmentPresetId;
  timeline: TimelinePoint[];
  recentEvents: ActivityEvent[];
  distractionLog: DistractionRecord[];
  xpEarned: number;
  bestFocusRunSeconds: number;
  lastTickAt: number | null;
  pomodoroCyclesCompleted: number;
  currentPhase: PomodoroPhase;
  currentCycle: number;
  totalCycles: number;
  trackingState: TrackingState;
}

export interface BestSessionRecord {
  id: string;
  endedAt: number;
  goal: string;
  focusScore: number;
  durationSeconds: number;
  xpEarned: number;
  longestStreakSeconds: number;
  presetId: EnvironmentPresetId;
}

export interface UnlockedBadge {
  id: string;
  unlockedAt: number;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  accent: string;
}

export interface ProfileState {
  totalXp: number;
  level: number;
  currentDayStreak: number;
  totalSessions: number;
  totalFocusSeconds: number;
  bestSession: BestSessionRecord | null;
  bestFocusScore: number;
  bestFocusStreakSeconds: number;
  bestXpSession: number;
  badges: UnlockedBadge[];
  lastSessionDay: string | null;
}

export interface SummaryCard {
  id: string;
  title: string;
  body: string;
  accent: string;
  metricLabel: string;
  metricValue: string;
}

export interface SessionSummary {
  id: string;
  endedAt: number;
  goal: string;
  presetId: EnvironmentPresetId;
  sessionType: SessionType;
  durationSeconds: number;
  focusSeconds: number;
  monitoredSeconds: number;
  uncertainSeconds: number;
  distractionCount: number;
  tabSwitchCount: number;
  inactivityCount: number;
  cameraDistractionCount: number;
  focusScore: number;
  longestStreakSeconds: number;
  currentStreakSeconds: number;
  xpEarned: number;
  pomodoroCyclesCompleted: number;
  timeline: TimelinePoint[];
  recentEvents: ActivityEvent[];
  distractionLog: DistractionRecord[];
  cards: SummaryCard[];
  headline: string;
  subheadline: string;
}

export interface PendingDistractionOverride {
  sessionId: string;
  eventId: string;
  detectedAt: number;
  bucketIndex: number;
  previousCurrentStreakSeconds: number;
  previousStreakStrikes: number;
  previousEscalationCount: number;
  streakBroken: boolean;
}

export interface StreakBreakNotice {
  detectedAt: number;
  brokenStreakSeconds: number;
  tips: string[];
}

export interface PendingDistractionTagPrompt {
  sessionId: string;
  distractionId: string;
  detectedAt: number;
}

export interface PersistedAppState {
  settings: FocusSettings;
  pomodoro: PomodoroState;
  profile: ProfileState;
  liveSession: SessionState;
  history: SessionSummary[];
  lastSummary: SessionSummary | null;
  pendingDistractionOverride: PendingDistractionOverride | null;
  streakBreakNotice: StreakBreakNotice | null;
  pendingDistractionTagPrompt: PendingDistractionTagPrompt | null;
}

export interface OverlayAlert {
  stage: AlertStage;
  reason: DistractionReason;
  title: string;
  message: string;
  detail: string;
}
