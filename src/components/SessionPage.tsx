import { useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, CameraOff, Play, Square } from 'lucide-react';
import { environmentPresets } from '../lib/presets';
import { formatClock, formatDuration } from '../lib/format';
import { CameraView } from './CameraView';
import type { useSessionEngine } from '../hooks/useSessionEngine';

type DashboardModel = ReturnType<typeof useSessionEngine>;

interface SessionPageProps {
  model: DashboardModel;
}

const setupSteps = [
  {
    id: 'goal',
    label: 'Goal',
    title: 'What do you want to finish?',
    detail: 'Write a short goal so the session starts with a clear target.',
  },
  {
    id: 'preset',
    label: 'Environment',
    title: 'Choose your study environment.',
    detail: 'Pick the setup that feels closest to where you are working today.',
  },
  {
    id: 'type',
    label: 'Session type',
    title: 'Pick the session format.',
    detail: 'Choose one continuous session or a Pomodoro with built-in breaks.',
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro',
    title: 'Set your timing.',
    detail: 'Only Pomodoro sessions use focus and break lengths.',
  },
  {
    id: 'streak',
    label: 'Streak limit',
    title: 'Choose when the streak resets.',
    detail: 'Set how many distractions are allowed before the current streak breaks.',
  },
] as const;

function phaseLabel(phase: DashboardModel['persisted']['liveSession']['currentPhase']) {
  if (phase === 'short-break') return 'Short Break';
  if (phase === 'long-break') return 'Long Break';
  return 'Focused';
}

function trackingLabel(model: DashboardModel) {
  if (!model.gaze.isTracking || model.gaze.trackingState === 'inactive') return 'Camera inactive';
  if (model.gaze.trackingState === 'calibrating') return 'Calibrating';
  if (model.gaze.trackingState === 'uncertain') return 'Tracking uncertain';
  return model.gaze.isDistracted ? 'Distraction detected' : 'Tracking active';
}

function countdownCopy(model: DashboardModel) {
  if (model.persisted.liveSession.currentPhase !== 'focus') {
    return {
      title: 'Break',
      detail: 'Distractions are not counted during breaks.',
      width: 0,
      tone: 'bg-slate-500',
    };
  }

  if (model.gaze.trackingState === 'uncertain') {
    return {
      title: 'Tracking uncertain',
      detail: 'The countdown pauses until tracking is stable again.',
      width: 0,
      tone: 'bg-amber-400',
    };
  }

  if (model.gaze.isDistracted) {
    return {
      title: 'Distraction recorded',
      detail: 'Focus again to keep building your streak.',
      width: 100,
      tone: 'bg-rose-500',
    };
  }

  if (model.gaze.distractionCountdownActive) {
    return {
      title: `Distraction in ${Math.ceil(model.gaze.distractionCountdownRemainingMs / 1000)}s`,
      detail: 'Look back at your work to reset the timer.',
      width: model.gaze.distractionCountdownProgress * 100,
      tone: 'bg-amber-400',
    };
  }

  return {
    title: 'Focused',
    detail: 'The bar fills only when your attention moves away.',
    width: 0,
    tone: 'bg-emerald-400',
  };
}

function sessionTypeLabel(type: DashboardModel['persisted']['settings']['sessionType']) {
  return type === 'pomodoro' ? 'Pomodoro' : 'Standard';
}

function pomodoroSummary(model: DashboardModel) {
  const settings = model.persisted.settings;

  if (settings.sessionType !== 'pomodoro') {
    return 'Pomodoro not used for this session';
  }

  return `${settings.pomodoroFocusMinutes}m focus, ${settings.pomodoroShortBreakMinutes}m short break, ${settings.pomodoroLongBreakMinutes}m long break, ${settings.pomodoroCycles} cycles`;
}

export function SessionPage({ model }: SessionPageProps) {
  const { persisted, actions, currentTimerSeconds, isSessionActive, cameraBusy, gaze } = model;
  const [setupStep, setSetupStep] = useState(0);
  const activeSetupStep = setupSteps[setupStep];
  const activePreset = environmentPresets[persisted.settings.presetId];
  const isLastSetupStep = setupStep === setupSteps.length - 1;

  if (isSessionActive) {
    const { liveSession } = persisted;
    const countdown = countdownCopy(model);
    const distractionsLeft = Math.max(liveSession.streakBreakThreshold - liveSession.streakStrikes, 0);

    return (
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-panel p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">Study Session</p>
          <div className="mt-5 text-6xl font-bold tracking-tight text-white sm:text-7xl">
            {formatClock(currentTimerSeconds)}
          </div>
          <p className="mt-2 text-lg text-slate-300">
            {phaseLabel(liveSession.currentPhase)}
            {liveSession.totalCycles > 1 ? ` | Cycle ${liveSession.currentCycle} of ${liveSession.totalCycles}` : ''}
          </p>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-500/10 p-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/80">Current streak</p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <p className="text-4xl font-bold tracking-tight text-white">{formatDuration(liveSession.currentStreakSeconds)}</p>
                <p className="pb-1 text-sm text-cyan-100/80">
                  Best this session: {formatDuration(liveSession.longestStreakSeconds)}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-cyan-50/85">
                Stay focused and keep the streak going.
              </p>
            </div>

            <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.25em] text-rose-100/70">Streak reset limit</p>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-rose-50">
                  {distractionsLeft}/{liveSession.streakBreakThreshold} left
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-2xl">
                {Array.from({ length: liveSession.streakBreakThreshold }, (_, index) => {
                  const active = index < distractionsLeft;
                  return (
                    <span key={`limit-${index}`} className={active ? 'text-rose-300' : 'text-slate-600'}>
                      {active ? 'O' : '-'}
                    </span>
                  );
                })}
              </div>
              <p className="mt-3 text-lg font-semibold text-white">
                {distractionsLeft === 1 ? 'One distraction left before streak reset.' : `${distractionsLeft} distractions left before streak reset.`}
              </p>
              <p className="mt-1 text-sm leading-6 text-rose-50/80">
                {liveSession.streakStrikes === 0
                  ? 'No distractions have counted against this streak yet.'
                  : 'Each recorded distraction uses one point before the streak resets.'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Phase</p>
              <p className="mt-2 text-lg font-semibold text-white">{phaseLabel(liveSession.currentPhase)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Cycle</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {liveSession.currentCycle} / {liveSession.totalCycles}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Distractions</p>
              <p className="mt-2 text-lg font-semibold text-white">{liveSession.distractionCount}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Focus score</p>
              <p className="mt-2 text-lg font-semibold text-white">{liveSession.focusScore}%</p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Distraction countdown</p>
                <p className="mt-2 text-lg font-semibold text-white">{countdown.title}</p>
                <p className="mt-1 text-sm text-slate-400">{countdown.detail}</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                {trackingLabel(model)}
              </div>
            </div>
            <div className="mt-4 h-3 rounded-full bg-slate-900">
              <div
                className={`h-3 rounded-full transition-all duration-200 ${countdown.tone}`}
                style={{ width: `${countdown.width}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={actions.endSession}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 font-semibold text-white transition hover:bg-rose-400"
          >
            <Square className="h-4 w-4" />
            End session
          </button>
        </section>

        <section className="glass-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Camera Preview</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Live camera view</h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-200">
              {trackingLabel(model)}
            </div>
          </div>

          <CameraView
            videoRef={gaze.videoRef}
            canvasRef={gaze.canvasRef}
            isTracking={gaze.isTracking}
            isFaceDetected={gaze.isFaceDetected}
            isLookingAway={gaze.isLookingAway}
            isCalibrating={gaze.isCalibrating}
            calibrationProgress={gaze.calibrationProgress}
            gazeX={gaze.gazeX}
            gazeY={gaze.gazeY}
            trackingState={gaze.trackingState}
            compact
          />
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
      <section className="glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">Session Setup</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-white">Set up your study session.</h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">
              Move through the steps one at a time, then start when everything looks right.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Camera status</p>
            <div className="mt-2 text-xl font-semibold text-white">{trackingLabel(model)}</div>
            <button
              type="button"
              onClick={gaze.isTracking ? actions.stopCamera : actions.startCamera}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.1]"
            >
              {gaze.isTracking ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {cameraBusy ? 'Opening camera...' : gaze.isTracking ? 'Turn off camera' : 'Turn on camera'}
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-[30px] border border-white/10 bg-black/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Step {setupStep + 1} of {setupSteps.length}</p>
              <p className="mt-2 text-lg font-semibold text-white">{activeSetupStep.title}</p>
              <p className="mt-1 text-sm text-slate-400">{activeSetupStep.detail}</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              {activeSetupStep.label}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {setupSteps.map((step, index) => {
              const active = index === setupStep;
              const completed = index < setupStep;

              return (
                <div key={step.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (index <= setupStep) setSetupStep(index);
                    }}
                    disabled={index > setupStep}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
                      active
                        ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                        : completed
                        ? 'border-white/15 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]'
                        : 'border-white/10 bg-white/[0.02] text-slate-500'
                    }`}
                  >
                    {index + 1}
                  </button>
                  {index < setupSteps.length - 1 && (
                    <div className={`h-px w-6 sm:w-10 ${completed ? 'bg-cyan-400/50' : 'bg-white/10'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-[30px] border border-white/10 bg-black/20 p-6">
          {setupStep === 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.3em] text-slate-400">Session goal</label>
              <textarea
                rows={4}
                value={persisted.settings.goal}
                onChange={event => actions.updateGoal(event.target.value)}
                className="mt-4 w-full rounded-[24px] border border-white/10 bg-slate-950/80 px-5 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                placeholder="Example: Finish chapter notes and review key terms."
              />
            </div>
          )}

          {setupStep === 1 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Environment preset</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {Object.values(environmentPresets).map(preset => {
                  const active = persisted.settings.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => actions.applyEnvironmentPreset(preset.id)}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        active
                          ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <p className="text-lg font-semibold text-white">{preset.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{preset.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {setupStep === 2 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Session type</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(['standard', 'pomodoro'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => actions.updateSessionType(type)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      persisted.settings.sessionType === type
                        ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <p className="text-lg font-semibold text-white">{sessionTypeLabel(type)}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {type === 'standard'
                        ? 'One continuous session with no automatic breaks.'
                        : 'Cycles through focus time and breaks automatically.'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {setupStep === 3 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Pomodoro settings</p>
              {persisted.settings.sessionType === 'pomodoro' ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Focus</span>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={persisted.settings.pomodoroFocusMinutes}
                      onChange={event => actions.updatePomodoroConfig('focus', Number(event.target.value))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Short break</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={persisted.settings.pomodoroShortBreakMinutes}
                      onChange={event => actions.updatePomodoroConfig('shortBreak', Number(event.target.value))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Long break</span>
                    <input
                      type="number"
                      min={5}
                      max={45}
                      value={persisted.settings.pomodoroLongBreakMinutes}
                      onChange={event => actions.updatePomodoroConfig('longBreak', Number(event.target.value))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Cycles</span>
                    <input
                      type="number"
                      min={2}
                      max={8}
                      value={persisted.settings.pomodoroCycles}
                      onChange={event => actions.updatePomodoroConfig('cycles', Number(event.target.value))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-lg font-semibold text-white">Standard session selected</p>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">
                    This session type does not use focus and break cycles. If you want timed blocks, go back and choose Pomodoro.
                  </p>
                </div>
              )}
            </div>
          )}

          {setupStep === 4 && (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Streak reset limit</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Choose how many distractions are allowed before the current streak resets.
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                  {persisted.settings.streakBreakThreshold} before streak reset
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {[1, 2, 3, 4, 5].map(value => {
                  const active = persisted.settings.streakBreakThreshold === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => actions.updateStreakBreakThreshold(value)}
                      className={`rounded-[22px] border px-4 py-3 text-left transition ${
                        active
                          ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{value}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {value === 1 ? 'Very strict' : value === 2 ? 'Strict' : value === 3 ? 'Balanced' : value === 4 ? 'Lenient' : 'Very lenient'}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xl">
                {Array.from({ length: persisted.settings.streakBreakThreshold }, (_, index) => (
                  <span key={`limit-${index}`} className="text-rose-300">
                    O
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => setSetupStep(step => Math.max(step - 1, 0))}
              disabled={setupStep === 0}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                setupStep === 0
                  ? 'cursor-not-allowed border border-white/10 bg-white/[0.03] text-slate-600'
                  : 'border border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {isLastSetupStep ? (
              <button
                type="button"
                onClick={() => void actions.startSession()}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-white transition hover:bg-cyan-400"
              >
                <Play className="h-4 w-4" />
                Start session
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSetupStep(step => Math.min(step + 1, setupSteps.length - 1))}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-white transition hover:bg-cyan-400"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="glass-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Camera Preview</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Turn on the camera to check framing and eye tracking</h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-200">
              {trackingLabel(model)}
            </div>
          </div>

          <CameraView
            videoRef={gaze.videoRef}
            canvasRef={gaze.canvasRef}
            isTracking={gaze.isTracking}
            isFaceDetected={gaze.isFaceDetected}
            isLookingAway={gaze.isLookingAway}
            isCalibrating={gaze.isCalibrating}
            calibrationProgress={gaze.calibrationProgress}
            gazeX={gaze.gazeX}
            gazeY={gaze.gazeY}
            trackingState={gaze.trackingState}
            compact
          />
        </div>

        <div className="glass-panel p-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Current Setup</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Goal</p>
              <p className="mt-2 text-sm leading-7 text-white">
                {persisted.settings.goal.trim() || 'No goal added yet.'}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Environment</p>
              <p className="mt-2 text-lg font-semibold text-white">{activePreset.title}</p>
              <p className="mt-1 text-sm text-slate-400">{activePreset.tagline}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Session type</p>
              <p className="mt-2 text-lg font-semibold text-white">{sessionTypeLabel(persisted.settings.sessionType)}</p>
              <p className="mt-1 text-sm text-slate-400">{pomodoroSummary(model)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Streak reset</p>
                <p className="mt-2 text-2xl font-semibold text-white">{persisted.settings.streakBreakThreshold}</p>
                <p className="mt-1 text-sm text-slate-400">distractions before streak reset</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Day streak</p>
                <p className="mt-2 text-2xl font-semibold text-white">{persisted.profile.currentDayStreak}</p>
                <p className="mt-1 text-sm text-slate-400">days in a row</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
