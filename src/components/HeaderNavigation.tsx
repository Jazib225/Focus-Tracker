import { BarChart3, Flame, Settings2, Timer } from 'lucide-react';

export type DashboardPage = 'session' | 'progress' | 'streaks' | 'settings';

interface HeaderNavigationProps {
  page: DashboardPage;
  onChange: (page: DashboardPage) => void;
}

const navItems: Array<{
  id: DashboardPage;
  label: string;
  icon: typeof Timer;
}> = [
  { id: 'session', label: 'Session', icon: Timer },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'streaks', label: 'Streaks', icon: Flame },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export function HeaderNavigation({ page, onChange }: HeaderNavigationProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-slate-950/75 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">Focus Tracker</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">Study session dashboard</h1>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'border-cyan-400/30 bg-cyan-500/12 text-cyan-100'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
