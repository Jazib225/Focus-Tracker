import React from 'react';
import {
  Play, Square, Timer, ShieldCheck, AlertCircle, Sliders, Zap,
  Volume2, VolumeX, Eye, EyeOff, Clock, Settings,
} from 'lucide-react';
import { CameraView } from './CameraView';

interface DashboardProps {
  isTracking: boolean;
  isDistracted: boolean;
  isLookingAway: boolean;
  isCalibrating: boolean;
  calibrationProgress: number;
  isFaceDetected: boolean;
  distractionCount: number;
  focusTimeSeconds: number;
  sensitivity: number;
  setSensitivity: (v: number) => void;
  alertDelay: number;
  setAlertDelay: (v: number) => void;
  alertSound: boolean;
  setAlertSound: (v: boolean) => void;
  alertFlash: boolean;
  setAlertFlash: (v: boolean) => void;
  gazeX: number;
  gazeY: number;
  onStart: () => void;
  onStop: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Simple pill toggle switch */
function Toggle({
  on, onChange, label, description, iconOn, iconOff,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-full flex items-center justify-between gap-4 rounded-xl border p-4 text-left
                  transition-colors duration-150 cursor-pointer
                  ${on
                    ? 'bg-indigo-950/60 border-indigo-500/40 hover:bg-indigo-950/80'
                    : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'}`}
    >
      <div className="flex items-center gap-3">
        <span className={on ? 'text-indigo-400' : 'text-slate-500'}>
          {on ? iconOn : iconOff}
        </span>
        <div>
          <p className={`text-sm font-semibold ${on ? 'text-slate-100' : 'text-slate-400'}`}>
            {label}
          </p>
          {description && (
            <p className="text-slate-500 text-xs mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {/* Track */}
      <div className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full
                       transition-colors duration-200
                       ${on ? 'bg-indigo-600' : 'bg-slate-700'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow
                          transition-transform duration-200
                          ${on ? 'translate-x-6' : 'translate-x-1'}`} />
      </div>
    </button>
  );
}

export const Dashboard: React.FC<DashboardProps> = ({
  isTracking,
  isDistracted,
  isLookingAway,
  isCalibrating,
  calibrationProgress,
  isFaceDetected,
  distractionCount,
  focusTimeSeconds,
  sensitivity,
  setSensitivity,
  alertDelay,
  setAlertDelay,
  alertSound,
  setAlertSound,
  alertFlash,
  setAlertFlash,
  gazeX,
  gazeY,
  onStart,
  onStop,
  videoRef,
  canvasRef,
}) => {
  const focusScore = focusTimeSeconds === 0
    ? 100
    : Math.max(0, Math.round(100 - distractionCount * 10));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">AI Focus Shield</h1>
              <p className="text-slate-500 text-xs">Gaze-powered distraction detection</p>
            </div>
          </div>

          {/* Status pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-200 ${
            !isTracking
              ? 'border-slate-700 bg-slate-800 text-slate-400'
              : isCalibrating
              ? 'border-indigo-500/50 bg-indigo-950 text-indigo-400'
              : isDistracted
              ? 'border-red-500/50 bg-red-950 text-red-400'
              : isLookingAway
              ? 'border-orange-500/50 bg-orange-950 text-orange-400'
              : isFaceDetected
              ? 'border-emerald-500/40 bg-emerald-950 text-emerald-400'
              : 'border-yellow-500/40 bg-yellow-950 text-yellow-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              !isTracking      ? 'bg-slate-500'
              : isCalibrating  ? 'bg-indigo-400 animate-pulse'
              : isDistracted   ? 'bg-red-400 animate-ping'
              : isLookingAway  ? 'bg-orange-400 animate-pulse'
              : isFaceDetected ? 'bg-emerald-400 animate-pulse'
              : 'bg-yellow-400 animate-pulse'
            }`} />
            {!isTracking     ? 'Offline'
              : isCalibrating  ? 'Calibrating…'
              : isDistracted   ? 'Distracted!'
              : isLookingAway  ? 'Eyes away'
              : isFaceDetected ? 'Focused'
              : 'No face found'}
          </div>
        </header>

        {/* ── Camera feed ── */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Camera Feed
          </p>
          <CameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            isTracking={isTracking}
            isFaceDetected={isFaceDetected}
            isLookingAway={isLookingAway}
            isCalibrating={isCalibrating}
            calibrationProgress={calibrationProgress}
            gazeX={gazeX}
            gazeY={gazeY}
          />
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">
              <Timer className="w-3.5 h-3.5" /> Focus Time
            </div>
            <span className="text-3xl font-bold text-white font-mono">
              {formatTime(focusTimeSeconds)}
            </span>
            <span className="text-slate-500 text-xs">Total focused time</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">
              <AlertCircle className="w-3.5 h-3.5" /> Distractions
            </div>
            <span className={`text-3xl font-bold font-mono ${
              distractionCount === 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {distractionCount}
            </span>
            <span className="text-slate-500 text-xs">Alert events fired</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest">
                <Zap className="w-3.5 h-3.5" /> Focus Score
              </div>
              <span className={`text-2xl font-bold font-mono ${
                focusScore >= 80 ? 'text-emerald-400'
                : focusScore >= 50 ? 'text-yellow-400'
                : 'text-red-400'
              }`}>{focusScore}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  focusScore >= 80 ? 'bg-emerald-500'
                  : focusScore >= 50 ? 'bg-yellow-500'
                  : 'bg-red-500'
                }`}
                style={{ width: `${focusScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Session controls ── */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <button
              onClick={isTracking ? onStop : onStart}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm
                          transition-all duration-200 shadow-lg shrink-0 ${
                isTracking
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/40'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/40'
              }`}
            >
              {isTracking
                ? <><Square className="w-4 h-4" /> Stop Session</>
                : <><Play className="w-4 h-4" /> Start Study Session</>}
            </button>

            {/* Gaze sensitivity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Gaze Sensitivity
                </span>
                <span className="ml-auto text-xs font-mono text-indigo-400">
                  {Math.round(sensitivity * 100)}%
                </span>
              </div>
              <input
                type="range" min="0.1" max="1" step="0.05"
                value={sensitivity}
                onChange={e => setSensitivity(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-indigo-500"
              />
              <div className="flex justify-between text-slate-600 text-[10px] mt-1">
                <span>Strict</span><span>Lenient</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Preferences ── */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Preferences
            </h2>
          </div>

          {/* Off-task delay slider */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Alert After
              </span>
              <span className="ml-auto text-sm font-mono font-bold text-indigo-400">
                {alertDelay}s
              </span>
            </div>
            <input
              type="range" min="1" max="60" step="1"
              value={alertDelay}
              onChange={e => setAlertDelay(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-indigo-500"
            />
            <div className="flex justify-between text-slate-600 text-[10px] mt-1">
              <span>1s (instant)</span>
              <span>30s</span>
              <span>60s (relaxed)</span>
            </div>
            <p className="text-slate-600 text-xs mt-2">
              Alert fires after <span className="text-slate-400 font-medium">{alertDelay} second{alertDelay !== 1 ? 's' : ''}</span> of continuous off-task gaze.
            </p>
          </div>

          {/* Alert type toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Toggle
              on={alertSound}
              onChange={setAlertSound}
              label="Sound Alert"
              description="Play a chime when distracted"
              iconOn={<Volume2 className="w-4 h-4" />}
              iconOff={<VolumeX className="w-4 h-4" />}
            />
            <Toggle
              on={alertFlash}
              onChange={setAlertFlash}
              label="Visual Flash"
              description="Flash the screen red when distracted"
              iconOn={<Eye className="w-4 h-4" />}
              iconOff={<EyeOff className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* ── Instructions (only shown before first session) ── */}
        {!isTracking && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-slate-400 text-sm leading-relaxed">
              <span className="text-slate-200 font-semibold">How it works: </span>
              Click <strong>Start Study Session</strong> to grant camera access. The AI tracks
              your eyes and face in real-time. If you look away for more than{' '}
              <strong>{alertDelay} second{alertDelay !== 1 ? 's' : ''}</strong>,
              {alertSound && alertFlash && ' a chime will sound and the screen will flash red.'}
              {alertSound && !alertFlash && ' a chime will sound.'}
              {!alertSound && alertFlash && ' the screen will flash red.'}
              {!alertSound && !alertFlash && ' you will see the distraction modal.'}
              {' '}Click <strong>I'm Back</strong> or look at the screen to dismiss.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
