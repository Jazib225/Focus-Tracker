import { useState } from 'react';
import { AdaptiveAlerts } from './AdaptiveAlerts';
import { DistractionTagPrompt } from './DistractionTagPrompt';
import { HeaderNavigation, type DashboardPage } from './HeaderNavigation';
import { ProgressPage } from './ProgressPage';
import { SessionPage } from './SessionPage';
import { SessionReportModal } from './SessionReportModal';
import { SettingsPage } from './SettingsPage';
import { StreaksPage } from './StreaksPage';
import type { useSessionEngine } from '../hooks/useSessionEngine';
import type { SessionSummary } from '../types/focus';

type DashboardModel = ReturnType<typeof useSessionEngine>;

interface DashboardProps {
  model: DashboardModel;
}

export function Dashboard({ model }: DashboardProps) {
  const [page, setPage] = useState<DashboardPage>('session');
  const [dismissedReportId, setDismissedReportId] = useState<string | null>(model.persisted.lastSummary?.id ?? null);
  const reportSummary: SessionSummary | null =
    model.persisted.lastSummary && model.persisted.lastSummary.id !== dismissedReportId
      ? model.persisted.lastSummary
      : null;

  const renderPage = () => {
    switch (page) {
      case 'progress':
        return <ProgressPage model={model} />;
      case 'streaks':
        return <StreaksPage model={model} />;
      case 'settings':
        return <SettingsPage model={model} />;
      case 'session':
      default:
        return <SessionPage model={model} />;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] text-slate-100">
      <div className="ambient-grid" />
      <div className="floating-orb orb-cyan" />
      <div className="floating-orb orb-violet" />
      <div className="floating-orb orb-amber" />

      <AdaptiveAlerts
        toastAlert={model.toastAlert}
        warningAlert={model.warningAlert}
        modalAlert={model.modalAlert}
        streakBreakNotice={model.persisted.streakBreakNotice}
        canOverrideLastDistraction={model.canOverrideLastDistraction}
        flashEnabled={model.persisted.settings.alertFlash}
        onDismissToast={model.actions.dismissToast}
        onDismissWarning={model.actions.dismissWarning}
        onDismissModal={model.actions.dismissModal}
        onDismissStreakBreakNotice={model.actions.dismissStreakBreakNotice}
        onOverrideLastDistraction={model.actions.overrideLastDistraction}
        onResetEscalation={model.actions.resetEscalation}
      />

      <DistractionTagPrompt
        open={model.pendingDistractionTagPrompt !== null}
        onTag={model.actions.tagPendingDistraction}
        onSkip={model.actions.dismissDistractionTagPrompt}
      />

      <SessionReportModal
        open={reportSummary !== null}
        summary={reportSummary}
        onClose={() => setDismissedReportId(model.persisted.lastSummary?.id ?? null)}
      />

      <HeaderNavigation page={page} onChange={setPage} />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {renderPage()}
      </main>
    </div>
  );
}
