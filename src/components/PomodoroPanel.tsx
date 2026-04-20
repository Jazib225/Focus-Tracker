import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { pomodoroPresets } from '../lib/presets';
import { formatClock } from '../lib/format';
import type { PomodoroPresetId, PomodoroState } from '../types/focus';

interface PomodoroPanelProps {
  pomodoro: PomodoroState;
  selectedPresetId: PomodoroPresetId;
  customFocusMinutes: number;
  customBreakMinutes: number;
  onSelectPreset: (presetId: PomodoroPresetId) => void;
  onToggle: () => void;
  onReset: () => void;
  onUpdateCustom: (field: 'focus' | 'break', value: number) => void;
}

const presetOrder: PomodoroPresetId[] = ['sprint', 'classic', 'deep', 'custom'];

export function PomodoroPanel({
  pomodoro,
  selectedPresetId,
  customFocusMinutes,
  customBreakMinutes,
  onSelectPreset,
  onToggle,
  onReset,
  onUpdateCustom,
}: PomodoroPanelProps) {
  const totalSeconds =
    pomodoro.mode === 'focus' ? pomodoro.focusMinutes * 60 : pomodoro.breakMinutes * 60;
  const ratio = totalSeconds === 0 ? 0 : pomodoro.remainingSeconds / totalSeconds;

  return (
    <div className="glass-panel p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Pomodoro</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Preset and custom focus loops</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {pomodoro.completedFocusBlocks} blocks done
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {presetOrder.map(presetId => {
          const active = selectedPresetId === presetId;
          const preset = presetId === 'custom'
            ? {
                label: 'Custom',
                description: `${customFocusMinutes} / ${customBreakMinutes}`,
              }
            : {
                label: pomodoroPresets[presetId].label,
                description: `${pomodoroPresets[presetId].focusMinutes} / ${pomodoroPresets[presetId].breakMinutes}`,
              };

          return (
            <button
              key={presetId}
              type="button"
              onClick={() => onSelectPreset(presetId)}
              className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                active
                  ? 'border-violet-400/30 bg-violet-500/10 text-violet-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              <div className="text-sm font-semibold">{preset.label}</div>
              <div className="mt-1 text-xs text-slate-400">{preset.description}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                {pomodoro.mode === 'focus' ? 'Focus Window' : 'Break Window'}
              </p>
              <div className="mt-2 text-5xl font-bold tracking-tight text-white">
                {formatClock(pomodoro.remainingSeconds)}
              </div>
            </div>
            <div
              className="grid h-24 w-24 place-items-center rounded-full border border-white/10"
              style={{
                background: `conic-gradient(#8b5cf6 ${ratio * 360}deg, rgba(148, 163, 184, 0.12) 0deg)`,
              }}
            >
              <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-950 text-slate-200">
                <Timer className="h-7 w-7" />
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 font-semibold text-white transition hover:bg-violet-400"
            >
              {pomodoro.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {pomodoro.isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Custom Timer</p>
          <div className="mt-5 grid gap-4">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Focus minutes</span>
              <input
                type="number"
                min={5}
                max={120}
                value={customFocusMinutes}
                onChange={event => onUpdateCustom('focus', Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-violet-400/50"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Break minutes</span>
              <input
                type="number"
                min={1}
                max={30}
                value={customBreakMinutes}
                onChange={event => onUpdateCustom('break', Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-violet-400/50"
              />
            </label>
            <p className="text-sm leading-6 text-slate-400">
              Select <span className="text-white">Custom</span> to use these values for demo runs or personalized study loops.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
