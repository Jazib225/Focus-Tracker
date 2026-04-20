import type { DistractionTag } from '../types/focus';

interface DistractionTagPromptProps {
  open: boolean;
  onTag: (tag: DistractionTag) => void;
  onSkip: () => void;
}

const tagOptions: Array<{ id: DistractionTag; label: string }> = [
  { id: 'phone', label: 'Phone' },
  { id: 'other-tab', label: 'Other tab' },
  { id: 'noise', label: 'Noise' },
  { id: 'people-nearby', label: 'People nearby' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'other', label: 'Other' },
];

export function DistractionTagPrompt({ open, onTag, onSkip }: DistractionTagPromptProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-5 z-40 mx-auto w-[min(96vw,860px)] px-4">
      <div className="rounded-[30px] border border-white/10 bg-slate-950/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Distraction tag</p>
            <h3 className="mt-2 text-lg font-semibold text-white">What pulled you away?</h3>
            <p className="mt-1 text-sm text-slate-400">
              Optional. If you skip this, the distraction will stay uncategorized.
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-slate-300 transition hover:bg-white/[0.08]"
          >
            Skip
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tagOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => onTag(option.id)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-100"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
