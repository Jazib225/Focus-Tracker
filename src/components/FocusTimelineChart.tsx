import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SessionSummary } from '../types/focus';

interface FocusTimelineChartProps {
  summary: Pick<SessionSummary, 'timeline' | 'sessionType' | 'distractionLog'>;
  title?: string;
  subtitle?: string;
  height?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function runningFocusScore(focusSeconds: number, monitoredSeconds: number, distractions: number) {
  if (monitoredSeconds === 0) return 100;
  return clamp(Math.round((focusSeconds / monitoredSeconds) * 100 - distractions * 6), 18, 100);
}

function phaseLabel(focusPhaseSeconds: number, breakPhaseSeconds: number) {
  if (breakPhaseSeconds === 0) return 'Focus';
  if (focusPhaseSeconds === 0) return 'Break';
  return 'Mixed';
}

export function FocusTimelineChart({
  summary,
  title = 'Focus score over time',
  subtitle = 'Focus score, distractions, and Pomodoro phases across the session.',
  height = 320,
}: FocusTimelineChartProps) {
  const chartData = summary.timeline.reduce<Array<
    SessionSummary['timeline'][number] & {
      cumulativeFocusSeconds: number;
      cumulativeMonitoredSeconds: number;
      cumulativeDistractions: number;
      focusScore: number;
      markerValue: number | null;
      markerSize: number;
      phaseBand: number;
      phaseLabel: string;
      phaseFill: string;
    }
  >>((accumulator, point) => {
    const previousPoint = accumulator[accumulator.length - 1];
    const monitoredSeconds = point.monitoredSeconds ?? 0;
    const breakPhaseSeconds = point.breakPhaseSeconds ?? 0;
    const focusPhaseSeconds = point.focusPhaseSeconds ?? Math.max(0, 30 - breakPhaseSeconds);
    const cumulativeFocusSeconds = (previousPoint?.cumulativeFocusSeconds ?? 0) + point.focusSeconds;
    const cumulativeMonitoredSeconds = (previousPoint?.cumulativeMonitoredSeconds ?? 0) + monitoredSeconds;
    const cumulativeDistractions = (previousPoint?.cumulativeDistractions ?? 0) + point.distractions;
    const focusScore = runningFocusScore(
      cumulativeFocusSeconds,
      cumulativeMonitoredSeconds,
      cumulativeDistractions
    );
    const currentPhaseLabel = phaseLabel(focusPhaseSeconds, breakPhaseSeconds);

    accumulator.push({
      ...point,
      cumulativeFocusSeconds,
      cumulativeMonitoredSeconds,
      cumulativeDistractions,
      focusScore,
      markerValue: point.distractions > 0 ? focusScore : null,
      markerSize: 80 + point.distractions * 24,
      phaseBand: summary.sessionType === 'pomodoro' ? 100 : 0,
      phaseLabel: currentPhaseLabel,
      phaseFill:
        currentPhaseLabel === 'Break'
          ? 'rgba(251, 191, 36, 0.18)'
          : currentPhaseLabel === 'Mixed'
          ? 'rgba(148, 163, 184, 0.14)'
          : 'rgba(34, 211, 238, 0.07)',
    });

    return accumulator;
  }, []);

  return (
    <div className="glass-panel p-5" style={{ height }}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Session Timeline</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-300">
            Focus score
          </span>
          <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-rose-100">
            Distractions
          </span>
          {summary.sessionType === 'pomodoro' && (
            <>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-100">
                Focus phase
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-amber-100">
                Break phase
              </span>
            </>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="focusScoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.36} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
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
            yAxisId="score"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          {summary.sessionType === 'pomodoro' && (
            <YAxis yAxisId="phase" hide domain={[0, 100]} />
          )}
          <Tooltip
            contentStyle={{
              background: 'rgba(10, 14, 25, 0.96)',
              border: '1px solid rgba(34, 211, 238, 0.16)',
              borderRadius: '16px',
              color: '#e2e8f0',
            }}
            formatter={(value, name, item) => {
              const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
              if (name === 'focusScore') return [`${numericValue}%`, 'Focus score'];
              if (name === 'markerValue') {
                const count = item?.payload?.distractions ?? 0;
                return [count, count === 1 ? 'Distraction' : 'Distractions'];
              }
              return [numericValue, name];
            }}
            labelFormatter={(_, payload) => {
              const point = payload?.[0]?.payload;
              if (!point) return '';
              return `${point.label} • ${point.phaseLabel}`;
            }}
          />

          {summary.sessionType === 'pomodoro' && (
            <Bar yAxisId="phase" dataKey="phaseBand" barSize={22} radius={[10, 10, 0, 0]}>
              {chartData.map(point => (
                <Cell key={`phase-${point.bucket}`} fill={point.phaseFill} />
              ))}
            </Bar>
          )}

          <Area
            yAxisId="score"
            type="monotone"
            dataKey="focusScore"
            stroke="#22d3ee"
            strokeWidth={0}
            fill="url(#focusScoreFill)"
          />
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="focusScore"
            stroke="#67e8f9"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: '#ffffff', stroke: '#22d3ee', strokeWidth: 2 }}
          />
          <Scatter
            yAxisId="score"
            dataKey="markerValue"
            fill="#fb7185"
            stroke="#ffe4e6"
            strokeWidth={1.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
