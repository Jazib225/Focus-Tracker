import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';
}

const toneClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  cyan: 'from-cyan-500/20 via-cyan-400/5 border-cyan-400/20 text-cyan-100',
  emerald: 'from-emerald-500/20 via-emerald-400/5 border-emerald-400/20 text-emerald-100',
  amber: 'from-amber-500/20 via-amber-400/5 border-amber-400/20 text-amber-100',
  rose: 'from-rose-500/20 via-rose-400/5 border-rose-400/20 text-rose-100',
  violet: 'from-violet-500/20 via-violet-400/5 border-violet-400/20 text-violet-100',
};

export function MetricCard({
  title,
  value,
  hint,
  icon,
  tone = 'cyan',
}: MetricCardProps) {
  return (
    <div className={`glass-panel bg-gradient-to-br ${toneClasses[tone]} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{title}</div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
}
