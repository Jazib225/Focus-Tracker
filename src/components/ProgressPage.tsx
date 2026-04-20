import { useMemo, useState } from 'react';
import { ActivityFeed } from './ActivityFeed';
import { FocusTimelineChart } from './FocusTimelineChart';
import { HistoryTrendChart } from './HistoryTrendChart';
import { MetricCard } from './MetricCard';
import { SessionSummary } from './SessionSummary';
import { formatDateTime, formatDuration } from '../lib/format';
import { Activity, Clock3, Eye, FileText, LineChart, TrendingUp } from 'lucide-react';
import type { useSessionEngine } from '../hooks/useSessionEngine';

type DashboardModel = ReturnType<typeof useSessionEngine>;
type ProgressDetailTab = 'report' | 'timeline' | 'events';

interface ProgressPageProps {
  model: DashboardModel;
}

export function ProgressPage({ model }: ProgressPageProps) {
  const { persisted, isSessionActive } = model;
  const latest = isSessionActive ? persisted.liveSession : persisted.lastSummary;
  const recentSessions = useMemo(() => persisted.history.slice(0, 5), [persisted.history]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<ProgressDetailTab>('report');
  const averageScore = persisted.history.length === 0
    ? 0
    : Math.round(persisted.history.reduce((sum, item) => sum + item.focusScore, 0) / persisted.history.length);
  const totalDistractions = persisted.history.reduce((sum, item) => sum + item.distractionCount, 0);
  const trackingCoverage = latest && latest.durationSeconds > 0
    ? Math.round((latest.monitoredSeconds / latest.durationSeconds) * 100)
    : 0;
  const selectedSession = recentSessions.find(item => item.id === selectedSessionId) ?? null;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Focus"
          value={formatDuration(persisted.profile.totalFocusSeconds)}
          hint="Total focused time across saved study sessions."
          icon={<Clock3 className="h-5 w-5" />}
          tone="cyan"
        />
        <MetricCard
          title="Average Score"
          value={`${averageScore}%`}
          hint="Average score across recent study sessions."
          icon={<TrendingUp className="h-5 w-5" />}
          tone="emerald"
        />
        <MetricCard
          title="Distractions"
          value={`${totalDistractions}`}
          hint="Webcam-detected distractions across session history."
          icon={<Activity className="h-5 w-5" />}
          tone="rose"
        />
        <MetricCard
          title="Tracking Coverage"
          value={`${trackingCoverage}%`}
          hint="How much of the latest session had stable tracking."
          icon={<Eye className="h-5 w-5" />}
          tone="violet"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <HistoryTrendChart history={persisted.history} />
        <div className="glass-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Recent Sessions</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Select a session to view details</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Details are hidden until you select a session.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
              Last {recentSessions.length}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {recentSessions.length === 0 ? (
              <div className="w-full rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
                Complete a few study sessions and the latest five will appear here.
              </div>
            ) : (
              recentSessions.map((session, index) => {
                const active = selectedSessionId === session.id;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setSelectedSessionId(current => current === session.id ? null : session.id);
                      setDetailTab('report');
                    }}
                    className={`min-w-[180px] rounded-[24px] border px-4 py-3 text-left transition ${
                      active
                        ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Session {index + 1}</div>
                    <div className="mt-2 text-sm font-semibold text-white">{formatDateTime(session.endedAt)}</div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>{session.focusScore}% score</span>
                      <span>{formatDuration(session.durationSeconds)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedSession && (
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Goal</p>
                <p className="mt-2 text-sm font-medium text-white">{selectedSession.goal || 'Untitled session'}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Type</p>
                <p className="mt-2 text-sm font-medium capitalize text-white">{selectedSession.sessionType}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Distractions</p>
                <p className="mt-2 text-sm font-medium text-white">{selectedSession.distractionCount}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">XP earned</p>
                <p className="mt-2 text-sm font-medium text-white">{selectedSession.xpEarned}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="glass-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Session Detail</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {selectedSession ? 'Session details' : 'Choose a recent session'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {selectedSession
                ? `${formatDateTime(selectedSession.endedAt)}`
                : 'Session details appear here after you select one above.'}
            </p>
          </div>

          {selectedSession && (
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'report' as const, label: 'Report', icon: FileText },
                { id: 'timeline' as const, label: 'Timeline', icon: LineChart },
                { id: 'events' as const, label: 'Events', icon: Activity },
              ].map(tab => {
                const Icon = tab.icon;
                const active = detailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      active
                        ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5">
          {!selectedSession ? (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center">
              <p className="text-lg font-semibold text-white">No session selected</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Select a recent session to view its summary, timeline, or events.
              </p>
            </div>
          ) : detailTab === 'report' ? (
            <SessionSummary summary={selectedSession} />
          ) : detailTab === 'timeline' ? (
            <FocusTimelineChart data={selectedSession.timeline} />
          ) : (
            <ActivityFeed events={selectedSession.recentEvents} />
          )}
        </div>
      </section>
    </div>
  );
}
