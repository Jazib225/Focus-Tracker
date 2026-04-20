import { BellRing, Volume2, VolumeX } from 'lucide-react';

interface GoalCardProps {
  goal: string;
  sensitivity: number;
  alertDelay: number;
  alertSound: boolean;
  alertFlash: boolean;
  inactivityThresholdSeconds: number;
  onChangeGoal: (goal: string) => void;
  onChangeSensitivity: (value: number) => void;
  onChangeAlertDelay: (value: number) => void;
  onToggleAlertSound: (value: boolean) => void;
  onToggleAlertFlash: (value: boolean) => void;
  onChangeInactivity: (value: number) => void;
}

export function GoalCard({
  goal,
  sensitivity,
  alertDelay,
  alertSound,
  alertFlash,
  inactivityThresholdSeconds,
  onChangeGoal,
  onChangeSensitivity,
  onChangeAlertDelay,
  onToggleAlertSound,
  onToggleAlertFlash,
  onChangeInactivity,
}: GoalCardProps) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Session Goal</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Give the session a clear finish line</h3>
      </div>

      <textarea
        rows={4}
        value={goal}
        onChange={event => onChangeGoal(event.target.value)}
        placeholder="Example: Finish chapter notes and one pass of spaced-repetition review."
        className="w-full rounded-[26px] border border-white/10 bg-slate-950/80 px-5 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Sensitivity</span>
            <span className="font-semibold text-cyan-200">{Math.round(sensitivity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.15}
            max={0.85}
            step={0.01}
            value={sensitivity}
            onChange={event => onChangeSensitivity(Number(event.target.value))}
            className="w-full accent-cyan-400"
          />
        </label>

        <label className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Alert delay</span>
            <span className="font-semibold text-cyan-200">{alertDelay}s</span>
          </div>
          <input
            type="range"
            min={2}
            max={12}
            step={1}
            value={alertDelay}
            onChange={event => onChangeAlertDelay(Number(event.target.value))}
            className="w-full accent-cyan-400"
          />
        </label>

        <label className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Inactivity threshold</span>
            <span className="font-semibold text-cyan-200">{inactivityThresholdSeconds}s</span>
          </div>
          <input
            type="range"
            min={20}
            max={90}
            step={5}
            value={inactivityThresholdSeconds}
            onChange={event => onChangeInactivity(Number(event.target.value))}
            className="w-full accent-cyan-400"
          />
        </label>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => onToggleAlertSound(!alertSound)}
            className={`inline-flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              alertSound
                ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                : 'border-white/10 bg-white/5 text-slate-300'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {alertSound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Sound alert
            </span>
            <span className="text-xs uppercase tracking-[0.25em]">{alertSound ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleAlertFlash(!alertFlash)}
            className={`inline-flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              alertFlash
                ? 'border-violet-400/30 bg-violet-500/10 text-violet-100'
                : 'border-white/10 bg-white/5 text-slate-300'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              Visual escalation
            </span>
            <span className="text-xs uppercase tracking-[0.25em]">{alertFlash ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
