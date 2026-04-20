import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimelinePoint } from '../types/focus';

interface FocusTimelineChartProps {
  data: TimelinePoint[];
}

export function FocusTimelineChart({ data }: FocusTimelineChartProps) {
  return (
    <div className="glass-panel h-[320px] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Session Timeline</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Focus over time</h3>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'dataMax + 1']}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(10, 14, 25, 0.95)',
              border: '1px solid rgba(34, 211, 238, 0.16)',
              borderRadius: '16px',
              color: '#e2e8f0',
            }}
            formatter={(value, name) => {
              const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
              const label = typeof name === 'string' ? name : String(name ?? '');
              if (label === 'focusPercent') return [`${numericValue}%`, 'Focus'];
              if (label === 'streakMinutes') return [`${numericValue.toFixed(1)}m`, 'Streak'];
              return [numericValue, 'Events'];
            }}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="focusPercent"
            stroke="#22d3ee"
            strokeWidth={3}
            fill="url(#focusFill)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="streakMinutes"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
