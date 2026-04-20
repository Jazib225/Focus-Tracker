import { AlertTriangle, Bell, ShieldAlert } from 'lucide-react';
import { formatDuration } from '../lib/format';
import type { OverlayAlert, StreakBreakNotice } from '../types/focus';

interface AdaptiveAlertsProps {
  toastAlert: OverlayAlert | null;
  warningAlert: OverlayAlert | null;
  modalAlert: OverlayAlert | null;
  streakBreakNotice: StreakBreakNotice | null;
  canOverrideLastDistraction: boolean;
  flashEnabled: boolean;
  onDismissToast: () => void;
  onDismissWarning: () => void;
  onDismissModal: () => void;
  onDismissStreakBreakNotice: () => void;
  onOverrideLastDistraction: () => void;
  onResetEscalation: () => void;
}

export function AdaptiveAlerts({
  toastAlert,
  warningAlert,
  modalAlert,
  streakBreakNotice,
  canOverrideLastDistraction,
  flashEnabled,
  onDismissToast,
  onDismissWarning,
  onDismissModal,
  onDismissStreakBreakNotice,
  onOverrideLastDistraction,
  onResetEscalation,
}: AdaptiveAlertsProps) {
  const canOverrideToast = canOverrideLastDistraction && toastAlert?.reason === 'camera';
  const canOverrideWarning = canOverrideLastDistraction && warningAlert?.reason === 'camera';
  const canOverrideModal = canOverrideLastDistraction && modalAlert?.reason === 'camera';

  return (
    <>
      {flashEnabled && warningAlert && !streakBreakNotice && (
        <div className="pointer-events-none fixed inset-0 z-20 warning-vignette" />
      )}

      {toastAlert && (
        <div className="fixed inset-x-0 top-5 z-40 mx-auto w-[min(92vw,520px)]">
          <div className="rounded-[28px] border border-cyan-400/20 bg-slate-950/90 px-5 py-4 shadow-2xl backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-cyan-500/10 p-2 text-cyan-200">
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{toastAlert.title}</p>
                <p className="mt-1 text-sm text-slate-300">{toastAlert.message}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{toastAlert.detail}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {canOverrideToast && (
                <button
                  type="button"
                  onClick={onOverrideLastDistraction}
                  className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  This should not count
                </button>
              )}
              <button
                type="button"
                onClick={onDismissToast}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {warningAlert && (
        <div className="fixed inset-x-0 top-5 z-40 mx-auto w-[min(94vw,760px)]">
          <div className="rounded-[32px] border border-amber-400/30 bg-amber-500/12 px-6 py-5 shadow-2xl backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-amber-500/15 p-2 text-amber-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-white">{warningAlert.title}</p>
                <p className="mt-1 text-amber-100">{warningAlert.message}</p>
                <p className="mt-2 text-sm leading-6 text-slate-200/80">{warningAlert.detail}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {canOverrideWarning && (
                <button
                  type="button"
                  onClick={onOverrideLastDistraction}
                  className="inline-flex items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
                >
                  This should not count
                </button>
              )}
              <button
                type="button"
                onClick={onDismissWarning}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {streakBreakNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-950/82 backdrop-blur-md" />
          <div className="relative z-10 w-full max-w-3xl rounded-[38px] border border-rose-400/25 bg-slate-950/95 p-8 shadow-[0_40px_160px_rgba(0,0,0,0.6)]">
            <div className="flex items-start gap-4">
              <div className="rounded-[28px] bg-rose-500/10 p-4 text-rose-200">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.3em] text-rose-200/80">Streak reset</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Your streak broke.</h2>
                <p className="mt-3 text-lg text-slate-200">
                  A focused stretch of {formatDuration(streakBreakNotice.brokenStreakSeconds)} just reset.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                  Take a breath, stretch, and start another streak. You've got this.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Try this next</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {streakBreakNotice.tips.map((tip, index) => (
                  <div
                    key={`${streakBreakNotice.detectedAt}-tip-${index}`}
                    className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-300"
                  >
                    {tip}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {canOverrideLastDistraction && (
                <button
                  type="button"
                  onClick={onOverrideLastDistraction}
                  className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-white transition hover:bg-cyan-400"
                >
                  This should not count
                </button>
              )}
              <button
                type="button"
                onClick={onDismissStreakBreakNotice}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAlert && !streakBreakNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
          <div className="relative z-10 w-full max-w-2xl rounded-[36px] border border-rose-400/25 bg-slate-950/92 p-8 shadow-[0_40px_160px_rgba(0,0,0,0.55)]">
            <div className="flex items-start gap-4">
              <div className="rounded-[28px] bg-rose-500/10 p-4 text-rose-200">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.3em] text-rose-200/80">Alert level 3</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">{modalAlert.title}</h2>
                <p className="mt-3 text-lg text-slate-200">{modalAlert.message}</p>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">{modalAlert.detail}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Suggestion</p>
                <p className="mt-3 text-base leading-7 text-slate-300">
                  Try rewriting your goal, shortening the next Pomodoro block, or using the Library preset.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Next step</p>
                <p className="mt-3 text-base leading-7 text-slate-300">
                  Resetting alerts keeps your session data and takes the warning level back to the first step.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {canOverrideModal && (
                <button
                  type="button"
                  onClick={onOverrideLastDistraction}
                  className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-white transition hover:bg-cyan-400"
                >
                  This should not count
                </button>
              )}
              <button
                type="button"
                onClick={onResetEscalation}
                className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-5 py-3 font-semibold text-white transition hover:bg-rose-400"
              >
                Reset alerts
              </button>
              <button
                type="button"
                onClick={onDismissModal}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Keep session open
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
