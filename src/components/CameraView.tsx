import React from 'react';
import { Camera, CameraOff } from 'lucide-react';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isTracking: boolean;
  isFaceDetected: boolean;
  isLookingAway: boolean;
  isCalibrating: boolean;
  calibrationProgress: number;
  gazeX: number;
  gazeY: number;
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
}) => {
  const dotX = 50 + gazeX * 120;
  const dotY = 50 + gazeY * 120;
  const clampedX = Math.max(5, Math.min(95, dotX));
  const clampedY = Math.max(5, Math.min(95, dotY));

  const borderColor = !isTracking
    ? 'border-slate-700'
    : isLookingAway
    ? 'border-orange-500'
    : 'border-emerald-500/60';

  return (
    <div className={`relative rounded-2xl overflow-hidden border-2 bg-slate-900 shadow-2xl transition-colors duration-300 ${borderColor}`}>
      {/* Video feed — tall enough to clearly see both eyes */}
      <video
        ref={videoRef}
        className="w-full h-80 object-cover block"
        style={{ transform: 'scaleX(-1)' }}
        muted
        playsInline
      />

      {/* Canvas overlay — mirrored to match the video */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Offline overlay */}
      {!isTracking && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
          <CameraOff className="w-10 h-10 text-slate-500 mb-2" />
          <p className="text-slate-400 text-sm">Camera offline</p>
        </div>
      )}

      {/* Calibration overlay — covers the feed while collecting baseline */}
      {isTracking && isCalibrating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/75 backdrop-blur-[2px] z-10">
          <p className="text-white text-sm font-semibold mb-1">Calibrating…</p>
          <p className="text-slate-400 text-xs mb-4">Hold still and look at the screen</p>
          <div className="w-48 h-2 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-100"
              style={{ width: `${Math.round(calibrationProgress * 100)}%` }}
            />
          </div>
          <p className="text-indigo-400 text-xs font-mono mt-2">
            {Math.round(calibrationProgress * 100)}%
          </p>
        </div>
      )}

      {/* Status badge */}
      {isTracking && !isCalibrating && (
        <div className={`absolute top-2 left-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 border text-xs font-medium transition-colors duration-200 ${
          !isFaceDetected
            ? 'bg-slate-900/80 border-slate-700 text-slate-300'
            : isLookingAway
            ? 'bg-orange-950/80 border-orange-500/50 text-orange-300'
            : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            !isFaceDetected ? 'bg-red-400 animate-pulse'
            : isLookingAway ? 'bg-orange-400 animate-pulse'
            : 'bg-emerald-400 animate-pulse'
          }`} />
          {!isFaceDetected ? 'No face' : isLookingAway ? 'Eyes away' : 'Focused'}
        </div>
      )}

      {/* Camera icon */}
      <div className="absolute top-2 right-2 bg-slate-900/80 rounded-full p-1.5 border border-slate-700">
        <Camera className="w-3.5 h-3.5 text-slate-400" />
      </div>

      {/* Gaze indicator */}
      {isTracking && isFaceDetected && (
        <div className="absolute bottom-2 right-2">
          <div className="relative w-14 h-14 rounded-lg border border-slate-600 bg-slate-900/90">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-slate-700 opacity-60" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-slate-700 opacity-60" />
            </div>
            <div
              className={`absolute w-2.5 h-2.5 rounded-full shadow-lg transition-all duration-75 ${
                isLookingAway ? 'bg-orange-400 shadow-orange-400/50' : 'bg-cyan-400 shadow-cyan-400/50'
              }`}
              style={{ left: `${clampedX}%`, top: `${clampedY}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <p className="text-center text-slate-500 text-[9px] mt-0.5">Gaze</p>
        </div>
      )}
    </div>
  );
};
