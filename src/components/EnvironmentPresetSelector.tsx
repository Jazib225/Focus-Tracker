import { BookOpen, Coffee, Moon } from 'lucide-react';
import { environmentPresets } from '../lib/presets';
import type { EnvironmentPresetId, FocusSettings } from '../types/focus';

interface EnvironmentPresetSelectorProps {
  settings: FocusSettings;
  onSelect: (presetId: EnvironmentPresetId) => void;
}

const iconMap = {
  dorm: Moon,
  library: BookOpen,
  cafe: Coffee,
};

export function EnvironmentPresetSelector({
  settings,
  onSelect,
}: EnvironmentPresetSelectorProps) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Environment Presets</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Tune the alert style to your space</h3>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {Object.values(environmentPresets).map(preset => {
          const Icon = iconMap[preset.id];
          const active = settings.presetId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              className={`rounded-3xl border p-4 text-left transition-all ${
                active
                  ? 'border-cyan-400/40 bg-white/10 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
              }`}
            >
              <div className={`mb-4 rounded-2xl bg-gradient-to-br ${preset.accent} p-3`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">{preset.title}</h4>
                {active && (
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-200">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-300">{preset.tagline}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">{preset.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-2">
                  Sensitivity {Math.round(settings.presetId === preset.id ? settings.sensitivity * 100 : preset.sensitivity * 100)}%
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-2">
                  Delay {settings.presetId === preset.id ? settings.alertDelay : preset.alertDelay}s
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
