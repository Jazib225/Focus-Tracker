import type {
  EnvironmentPresetDefinition,
  EnvironmentPresetId,
  FocusSettings,
  PomodoroPresetDefinition,
  PomodoroState,
} from '../types/focus';

export const environmentPresets: Record<EnvironmentPresetId, EnvironmentPresetDefinition> = {
  dorm: {
    id: 'dorm',
    title: 'Dorm',
    tagline: 'Good for shared rooms and late-night studying.',
    description: 'Uses gentler settings when you want a little more flexibility.',
    sensitivity: 0.72,
    alertDelay: 9,
    alertSound: false,
    alertFlash: true,
    accent: 'from-fuchsia-500/25 via-violet-500/10 to-transparent',
  },
  library: {
    id: 'library',
    title: 'Library',
    tagline: 'Balanced settings for quiet, focused study.',
    description: 'A steady default when you want reliable distraction tracking.',
    sensitivity: 0.54,
    alertDelay: 6,
    alertSound: true,
    alertFlash: true,
    accent: 'from-cyan-500/25 via-sky-500/10 to-transparent',
  },
  cafe: {
    id: 'cafe',
    title: 'Cafe',
    tagline: 'Stronger tracking for busier spaces.',
    description: 'Uses quicker alerts and higher sensitivity when distractions are more likely.',
    sensitivity: 0.36,
    alertDelay: 4,
    alertSound: true,
    alertFlash: true,
    accent: 'from-amber-500/25 via-orange-500/10 to-transparent',
  },
};

export const pomodoroPresets: Record<'sprint' | 'classic' | 'deep', PomodoroPresetDefinition> = {
  sprint: {
    id: 'sprint',
    label: 'Sprint',
    description: '15 / 3 for quick revision loops.',
    focusMinutes: 15,
    breakMinutes: 3,
  },
  classic: {
    id: 'classic',
    label: 'Classic',
    description: '25 / 5 for familiar Pomodoro pacing.',
    focusMinutes: 25,
    breakMinutes: 5,
  },
  deep: {
    id: 'deep',
    label: 'Deep',
    description: '45 / 8 for longer concentration blocks.',
    focusMinutes: 45,
    breakMinutes: 8,
  },
};

export function createDefaultSettings(): FocusSettings {
  const preset = environmentPresets.library;
  return {
    presetId: preset.id,
    sensitivity: preset.sensitivity,
    alertDelay: preset.alertDelay,
    alertSound: preset.alertSound,
    alertFlash: preset.alertFlash,
    streakBreakThreshold: 3,
    goal: 'Finish a focused study session.',
    sessionType: 'standard',
    pomodoroPresetId: 'classic',
    pomodoroFocusMinutes: 25,
    pomodoroShortBreakMinutes: 5,
    pomodoroLongBreakMinutes: 15,
    pomodoroCycles: 4,
    customFocusMinutes: 25,
    customBreakMinutes: 5,
    autoStartBreak: true,
  };
}

export function applyPresetToSettings(
  presetId: EnvironmentPresetId,
  previous: FocusSettings
): FocusSettings {
  const preset = environmentPresets[presetId];
  return {
    ...previous,
    presetId,
    sensitivity: preset.sensitivity,
    alertDelay: preset.alertDelay,
    alertSound: preset.alertSound,
    alertFlash: preset.alertFlash,
  };
}

export function getPomodoroTemplate(
  presetId: FocusSettings['pomodoroPresetId'],
  settings: FocusSettings
): {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cycles: number;
} {
  if (presetId === 'custom') {
    return {
      focusMinutes: settings.pomodoroFocusMinutes,
      shortBreakMinutes: settings.pomodoroShortBreakMinutes,
      longBreakMinutes: settings.pomodoroLongBreakMinutes,
      cycles: settings.pomodoroCycles,
    };
  }

  const preset = pomodoroPresets[presetId];
  return {
    focusMinutes: preset.focusMinutes,
    shortBreakMinutes: preset.breakMinutes,
    longBreakMinutes: Math.max(preset.breakMinutes * 3, 12),
    cycles: 4,
  };
}

export function createPomodoroState(settings: FocusSettings): PomodoroState {
  const { focusMinutes, shortBreakMinutes, longBreakMinutes, cycles } = getPomodoroTemplate(
    settings.pomodoroPresetId,
    settings
  );

  return {
    presetId: settings.pomodoroPresetId,
    focusMinutes,
    breakMinutes: shortBreakMinutes,
    shortBreakMinutes,
    longBreakMinutes,
    cyclesBeforeLongBreak: cycles,
    mode: 'focus',
    phase: 'focus',
    remainingSeconds: focusMinutes * 60,
    isRunning: false,
    completedFocusBlocks: 0,
    currentCycle: 1,
    totalCycles: cycles,
    lastUpdatedAt: null,
  };
}
