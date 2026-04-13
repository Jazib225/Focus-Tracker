import React from 'react';
import { AlertTriangle, Eye, CheckCircle } from 'lucide-react';

interface DistractionModalProps {
  isDistracted: boolean;
  onDismiss: () => void;
}

export const DistractionModal: React.FC<DistractionModalProps> = ({ isDistracted, onDismiss }) => {
  if (!isDistracted) return null;

  return (
    // Outer wrapper: pointer-events-none so clicks pass through to the dashboard
    // EXCEPT for the modal card itself which needs to be clickable
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred backdrop — not interactive */}
      <div className="absolute inset-0 bg-red-900/30 backdrop-blur-sm pointer-events-none" />

      {/* Modal card — interactive */}
      <div className="relative z-10 flex flex-col items-center gap-5 rounded-2xl border-2 border-red-500 bg-slate-900/98 px-10 py-8 shadow-2xl shadow-red-900/60 max-w-sm mx-4">
        {/* Pulsing alert icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 animate-pulse">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <div className="text-center">
          <p className="text-red-400 text-xs font-bold tracking-[0.25em] uppercase mb-1">
            Focus Alert
          </p>
          <h2 className="text-white text-xl font-bold leading-snug">
            DISTRACTION DETECTED
          </h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            You looked away for too long. Get back to your task to resume focus tracking.
          </p>
        </div>

        {/* Auto-dismiss hint */}
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span>Tracking will auto-dismiss when you refocus</span>
        </div>

        <div className="w-full h-px bg-slate-800" />

        {/* Manual dismiss button */}
        <button
          onClick={onDismiss}
          className="flex items-center gap-2 w-full justify-center px-6 py-3 rounded-xl
                     bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
                     text-white font-semibold text-sm transition-colors duration-150
                     shadow-lg shadow-emerald-900/40 focus:outline-none focus:ring-2
                     focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <CheckCircle className="w-4 h-4" />
          I'm Back — Resume Tracking
        </button>

        {/* Flashing progress bar */}
        <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-red-500 rounded-full distraction-flash w-full" />
        </div>
      </div>
    </div>
  );
};
