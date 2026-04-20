import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDateTime, formatDuration } from '../lib/format';
import type { SessionSummary } from '../types/focus';

interface HistoryTrendChartProps {
  history: SessionSummary[];
}

export function HistoryTrendChart({ history }: HistoryTrendChartProps) {
  const chartData = [...history]
    .slice(0, 8)
    .reverse()
    .map(item => ({
      id: item.id,
      date: formatDateTime(item.endedAt),
      score: item.focusScore,
      durationMinutes: Math.max(1, Math.round(item.durationSeconds / 60)),
      distractions: item.distractionCount,
    }));

  return (
    <div className="glass-panel h-[320px] p-5">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">History</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Recent study sessions</h3>
      </div>

      {chartData.length === 0 ? (
        <div className="grid h-[220px] place-items-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-400">
          Complete a study session to start building your history.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                background: 'rgba(10, 14, 25, 0.95)',
                border: '1px solid rgba(34, 211, 238, 0.16)',
                borderRadius: '16px',
                color: '#e2e8f0',
              }}
              formatter={(value, name, payload) => {
                if (name === 'score') return [`${value}%`, 'Focus score'];
                if (name === 'durationMinutes' && payload?.payload?.durationMinutes) {
                  return [formatDuration(payload.payload.durationMinutes * 60), 'Duration'];
                }
                return [value, 'Value'];
              }}
            />
            <Bar dataKey="score" fill="#22d3ee" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
