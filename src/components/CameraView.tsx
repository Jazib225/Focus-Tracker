import type React from 'react';
import { Camera, CameraOff } from 'lucide-react';
import type { TrackingState } from '../types/focus';

interface CameraViewProps {
  videoRef: React.Ref<HTMLVideoElement>;
  canvasRef: React.Ref<HTMLCanvasElement>;
  isTracking: boolean;
  isFaceDetected: boolean;
  isLookingAway: boolean;
  isCalibrating: boolean;
  calibrationProgress: number;
  gazeX: number;
  gazeY: number;
  trackingState: TrackingState;
  compact?: boolean;
}

function trackingCopy(
  isTracking: boolean,
  trackingState: TrackingState,
  isLookingAway: boolean,
  isFaceDetected: boolean
) {
  if (!isTracking || trackingState === 'inactive') {
    return {
      label: 'Camera inactive',
      detail: 'Turn on the camera to use distraction tracking.',
      tone: 'bg-slate-500',
    };
  }

  if (trackingState === 'calibrating') {
    return {
      label: 'Calibrating',
      detail: 'Look at the screen while tracking starts.',
      tone: 'bg-cyan-400',
    };
  }

  if (trackingState === 'uncertain') {
    return {
      label: 'Tracking uncertain',
      detail: 'Distractions are not counted while the camera signal is unreliable.',
      tone: 'bg-amber-400',
    };
  }

  if (isLookingAway) {
    return {
      label: 'Distraction detected',
      detail: 'Your eyes appear to be away from the screen.',
      tone: 'bg-rose-400',
    };
  }

  if (isFaceDetected) {
    return {
      label: 'Focused',
      detail: 'Tracking is active and working normally.',
      tone: 'bg-emerald-400',
    };
  }

  return {
    label: 'Looking for face',
    detail: 'Move into view so tracking can begin.',
    tone: 'bg-slate-400',
  };
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  canvasRef,
  isTracking,
  isFaceDetected,
  isLookingAway,
  isCalibrating,
  calibrationProgress,
  gazeX,
  gazeY,
  trackingState,
  compact = false,
}) => {
  const dotX = 50 + gazeX * 120;
  const dotY = 50 + gazeY * 120;
  const clampedX = Math.max(5, Math.min(95, dotX));
  const clampedY = Math.max(5, Math.min(95, dotY));
  const status = trackingCopy(isTracking, trackingState, isLookingAway, isFaceDetected);

  return (
    <div className={`relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/85 ${compact ? 'max-w-sm' : ''}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.15),transparent_30%)]" />

      <video
        ref={videoRef}
        className={`${compact ? 'h-52' : 'h-72'} relative z-10 w-full object-cover opacity-95`}
        style={{ transform: 'scaleX(-1)' }}
        muted
        playsInline
      />

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        style={{ transform: 'scaleX(-1)' }}
      />

      {!isTracking && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/90">
          <div className="px-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300">
              <CameraOff className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-semibold text-white">Camera inactive</p>
            <p className="mt-2 text-sm text-slate-400">The timer can keep running, but distractions will not be tracked until the camera is on.</p>
          </div>
        </div>
      )}

      {isTracking && isCalibrating && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-[28px] border border-white/10 bg-black/35 px-6 py-5 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">Calibrating</p>
            <p className="mt-3 text-lg font-semibold text-white">Look at the screen for a moment</p>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                style={{ width: `${Math.round(calibrationProgress * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-300">{Math.round(calibrationProgress * 100)}%</p>
          </div>
        </div>
      )}

      <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/85 px-3 py-1.5 text-xs font-semibold text-white">
        <span className={`h-2 w-2 rounded-full ${status.tone}`} />
        {status.label}
      </div>

      <div className="absolute right-4 top-4 z-30 rounded-full border border-white/10 bg-slate-950/85 p-2 text-slate-200">
        <Camera className="h-4 w-4" />
      </div>

      {isTracking && isFaceDetected && trackingState === 'active' && (
        <div className="absolute bottom-4 right-4 z-30">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/85 px-3 py-3">
            <div className="relative h-16 w-16 rounded-2xl border border-white/10 bg-black/25">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10" />
              <div
                className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  isLookingAway
                    ? 'bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.75)]'
                    : 'bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.75)]'
                }`}
                style={{ left: `${clampedX}%`, top: `${clampedY}%` }}
              />
            </div>
            <p className="mt-2 text-center text-[10px] uppercase tracking-[0.25em] text-slate-500">Eye tracking</p>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-transparent px-4 pb-4 pt-10">
        <p className="text-sm font-medium text-white">{status.label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{status.detail}</p>
      </div>
    </div>
  );
};
