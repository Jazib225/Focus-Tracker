import { AlertTriangle, Clock } from 'lucide-react';
import { formatDateTime } from '../lib/format';
import type { ActivityEvent } from '../types/focus';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

const iconMap = {
  camera: AlertTriangle,
  inactivity: Clock,
  'pomodoro-break': Clock,
  'tab-switch': Clock,
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Session events</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Recent distractions and alerts</h3>
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
            No events yet. Start a study session to see activity here.
          </div>
        ) : (
          events.map(event => {
            const Icon = iconMap[event.reason];
            return (
              <div key={event.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-2 text-slate-200">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{event.label}</p>
                      <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{event.detail}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
