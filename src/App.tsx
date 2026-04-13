import './index.css';
import { useGazeTracking } from './hooks/useGazeTracking';
import { Dashboard } from './components/Dashboard';
import { DistractionModal } from './components/DistractionModal';

function App() {
  const {
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
    startTracking,
    stopTracking,
    dismissAlert,
    videoRef,
    canvasRef,
    gazeX,
    gazeY,
  } = useGazeTracking();

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* Flash overlay — only rendered when both distracted AND flash is enabled.
          Removed from DOM entirely when not distracted so animation stops cleanly. */}
      {isDistracted && alertFlash && (
        <div className="fixed inset-0 pointer-events-none z-30 bg-red-600/25 distraction-flash" />
      )}

      <Dashboard
        isTracking={isTracking}
        isDistracted={isDistracted}
        isLookingAway={isLookingAway}
        isCalibrating={isCalibrating}
        calibrationProgress={calibrationProgress}
        isFaceDetected={isFaceDetected}
        distractionCount={distractionCount}
        focusTimeSeconds={focusTimeSeconds}
        sensitivity={sensitivity}
        setSensitivity={setSensitivity}
        alertDelay={alertDelay}
        setAlertDelay={setAlertDelay}
        alertSound={alertSound}
        setAlertSound={setAlertSound}
        alertFlash={alertFlash}
        setAlertFlash={setAlertFlash}
        onStart={startTracking}
        onStop={stopTracking}
        videoRef={videoRef}
        canvasRef={canvasRef}
        gazeX={gazeX}
        gazeY={gazeY}
      />

      <DistractionModal isDistracted={isDistracted} onDismiss={dismissAlert} />
    </div>
  );
}

export default App;
