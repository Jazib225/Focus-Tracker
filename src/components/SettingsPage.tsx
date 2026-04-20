import { Bell, SlidersHorizontal, Volume2 } from 'lucide-react';
import { environmentPresets } from '../lib/presets';
import type { useSessionEngine } from '../hooks/useSessionEngine';

type DashboardModel = ReturnType<typeof useSessionEngine>;

interface SettingsPageProps {
  model: DashboardModel;
}

export function SettingsPage({ model }: SettingsPageProps) {
  const { persisted, actions } = model;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="glass-panel p-5">
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Detection</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Adjust how distraction tracking behaves</h3>
        </div>

        <div className="space-y-5">
          <label className="block">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-cyan-300" />
                Sensitivity
              </span>
              <span className="font-semibold text-cyan-200">{Math.round(persisted.settings.sensitivity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.15}
              max={0.85}
              step={0.01}
              value={persisted.settings.sensitivity}
              onChange={event => actions.updateSensitivity(Number(event.target.value))}
              className="mt-3 w-full accent-cyan-400"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <Bell className="h-4 w-4 text-cyan-300" />
                Alert delay
              </span>
              <span className="font-semibold text-cyan-200">{persisted.settings.alertDelay}s</span>
            </div>
            <input
              type="range"
              min={2}
              max={12}
              step={1}
              value={persisted.settings.alertDelay}
              onChange={event => actions.updateAlertDelay(Number(event.target.value))}
              className="mt-3 w-full accent-cyan-400"
            />
          </label>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Streak reset limit</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Choose how many distractions are allowed before the current streak resets.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-sm text-slate-200">
                {persisted.settings.streakBreakThreshold} before reset
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
                      {value === 1 ? 'Low' : value <= 3 ? 'Medium' : 'High'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xl">
              {Array.from({ length: persisted.settings.streakBreakThreshold }, (_, index) => (
                <span key={`settings-limit-${index}`} className="text-rose-300">
                  O
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => actions.toggleAlertSound(!persisted.settings.alertSound)}
              className={`rounded-[26px] border px-4 py-4 text-left transition ${
                persisted.settings.alertSound
                  ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                  : 'border-white/10 bg-white/[0.04] text-slate-300'
              }`}
            >
              <p className="inline-flex items-center gap-2 font-semibold text-white">
                <Volume2 className="h-4 w-4" />
                Sound alerts
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Play a sound when a distraction is recorded or a Pomodoro phase changes.
              </p>
            </button>

            <button
              type="button"
              onClick={() => actions.toggleAlertFlash(!persisted.settings.alertFlash)}
              className={`rounded-[26px] border px-4 py-4 text-left transition ${
                persisted.settings.alertFlash
                  ? 'border-violet-400/30 bg-violet-500/10 text-violet-100'
                  : 'border-white/10 bg-white/[0.04] text-slate-300'
              }`}
            >
              <p className="inline-flex items-center gap-2 font-semibold text-white">
                <Bell className="h-4 w-4" />
                Visual alerts
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Show stronger on-screen warnings after repeated distractions.
              </p>
            </button>
          </div>
        </div>
      </section>

      <section className="glass-panel p-5">
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Presets</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Compare the environment presets</h3>
        </div>

        <div className="space-y-3">
          {Object.values(environmentPresets).map(preset => {
            const active = persisted.settings.presetId === preset.id;
            return (
              <div
                key={preset.id}
                className={`rounded-[28px] border p-4 ${
                  active
                    ? 'border-cyan-400/25 bg-cyan-500/10'
                    : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{preset.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{preset.description}</p>
                  </div>
                  {active && (
                    <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-100">
                      Active
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                    <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Sensitivity</span>
                    <span className="mt-2 block font-medium text-white">{Math.round(preset.sensitivity * 100)}%</span>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                    <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Delay</span>
                    <span className="mt-2 block font-medium text-white">{preset.alertDelay}s</span>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                    <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Sound</span>
                    <span className="mt-2 block font-medium text-white">{preset.alertSound ? 'On' : 'Off'}</span>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                    <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Visual</span>
                    <span className="mt-2 block font-medium text-white">{preset.alertFlash ? 'On' : 'Off'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
