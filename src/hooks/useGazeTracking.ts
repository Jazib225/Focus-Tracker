import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, RefCallback } from 'react';
import type { Results, NormalizedLandmark } from '@mediapipe/face_mesh';
import type { TrackingState } from '../types/focus';

// MediaPipe is loaded via CDN in index.html and exposed on window.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FaceMesh = (window as any).FaceMesh as new (opts: { locateFile: (f: string) => string }) => {
  setOptions: (o: Record<string, unknown>) => Promise<void>;
  onResults: (cb: (r: Results) => void) => void;
  send: (i: { image: HTMLVideoElement }) => Promise<void>;
  close: () => void;
};

const POST_ALARM_COOLDOWN = 2500;
const SMOOTH_ALPHA = 0.55;
const CALIBRATION_MS = 2500;
const BASELINE_DRIFT = 0.003;
const UNCERTAIN_AFTER_MS = 2000;
const PROCESS_LOOP_DELAY_MS = 90;

const IRIS_LEFT = 468;
const IRIS_RIGHT = 473;
const L_EYE_INNER = 133;
const L_EYE_OUTER = 33;
const L_EYE_OUTER2 = 130;
const L_EYE_TOP = 159;
const L_EYE_BOTTOM = 145;
const R_EYE_INNER = 362;
const R_EYE_OUTER = 263;
const R_EYE_OUTER2 = 359;
const R_EYE_TOP = 386;
const R_EYE_BOTTOM = 374;
const NOSE_TIP = 1;
const LEFT_EAR = 234;
const RIGHT_EAR = 454;
const FOREHEAD = 10;
const CHIN = 152;

export interface GazeTrackingReturn {
  isTracking: boolean;
  isDistracted: boolean;
  isLookingAway: boolean;
  isCalibrating: boolean;
  calibrationProgress: number;
  isFaceDetected: boolean;
  trackingState: TrackingState;
  distractionCount: number;
  focusTimeSeconds: number;
  distractionCountdownActive: boolean;
  distractionCountdownRemainingMs: number;
  distractionCountdownProgress: number;
  sensitivity: number;
  setSensitivity: (v: number) => void;
  alertDelay: number;
  setAlertDelay: (v: number) => void;
  alertSound: boolean;
  setAlertSound: (v: boolean) => void;
  alertFlash: boolean;
  setAlertFlash: (v: boolean) => void;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  dismissAlert: () => void;
  videoRef: RefCallback<HTMLVideoElement>;
  canvasRef: RefCallback<HTMLCanvasElement>;
  gazeX: number;
  gazeY: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function playAlertChime() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const startAt = ctx.currentTime + index * 0.18;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.35, startAt + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.45);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.5);
    });
  } catch {
    // Audio is best effort only.
  }
}

function getRawGaze(landmarks: NormalizedLandmark[]): { x: number; y: number } | null {
  if (landmarks.length <= IRIS_RIGHT) return null;

  const irisLeft = landmarks[IRIS_LEFT];
  const irisRight = landmarks[IRIS_RIGHT];

  const leftOuter = landmarks[L_EYE_OUTER];
  const leftInner = landmarks[L_EYE_INNER];
  const leftTop = landmarks[L_EYE_TOP];
  const leftBottom = landmarks[L_EYE_BOTTOM];
  const leftCenterX = (leftOuter.x + leftInner.x) / 2;
  const leftCenterY = (leftTop.y + leftBottom.y) / 2;
  const leftHalfW = Math.abs(leftOuter.x - leftInner.x) / 2 || 0.001;
  const leftHalfH = Math.abs(leftBottom.y - leftTop.y) / 2 || 0.001;

  const leftX = (irisLeft.x - leftCenterX) / leftHalfW;
  const leftY = (irisLeft.y - leftCenterY) / leftHalfH;

  const rightOuter = landmarks[R_EYE_OUTER];
  const rightInner = landmarks[R_EYE_INNER];
  const rightTop = landmarks[R_EYE_TOP];
  const rightBottom = landmarks[R_EYE_BOTTOM];
  const rightCenterX = (rightOuter.x + rightInner.x) / 2;
  const rightCenterY = (rightTop.y + rightBottom.y) / 2;
  const rightHalfW = Math.abs(rightOuter.x - rightInner.x) / 2 || 0.001;
  const rightHalfH = Math.abs(rightBottom.y - rightTop.y) / 2 || 0.001;

  const rightX = -(irisRight.x - rightCenterX) / rightHalfW;
  const rightY = (irisRight.y - rightCenterY) / rightHalfH;

  return {
    x: (leftX + rightX) / 2,
    y: (leftY + rightY) / 2,
  };
}

function getRawYaw(landmarks: NormalizedLandmark[]): number {
  const nose = landmarks[NOSE_TIP];
  const leftEar = landmarks[LEFT_EAR];
  const rightEar = landmarks[RIGHT_EAR];
  const faceWidth = Math.abs(rightEar.x - leftEar.x) || 0.001;
  const noseMid = (leftEar.x + rightEar.x) / 2;
  return (nose.x - noseMid) / faceWidth;
}

function getRawPitch(landmarks: NormalizedLandmark[]): number {
  const faceWidth = Math.abs(landmarks[LEFT_EAR].x - landmarks[RIGHT_EAR].x) || 0.1;
  return (landmarks[CHIN].z - landmarks[FOREHEAD].z) / faceWidth;
}

type LookReason = 'focused' | 'gaze' | 'yaw' | 'pitch';

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarks: NormalizedLandmark[],
  lookReason: LookReason,
  isDistracted: boolean
) {
  ctx.clearRect(0, 0, width, height);

  const lookingAway = lookReason !== 'focused';
  const mainColor = isDistracted ? '#ef4444' : lookingAway ? '#f97316' : '#22c55e';
  const eyeColor = isDistracted ? '#f87171' : lookingAway ? '#fb923c' : '#34d399';
  const label = isDistracted
    ? 'DISTRACTED'
    : lookReason === 'pitch'
    ? 'LOOKING DOWN'
    : lookReason === 'yaw'
    ? 'HEAD TURNED'
    : lookReason === 'gaze'
    ? 'EYES AWAY'
    : 'FOCUSED';

  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  const padding = 0.015;
  const boxX = (minX - padding) * width;
  const boxY = (minY - padding) * height;
  const boxW = (maxX - minX + padding * 2) * width;
  const boxH = (maxY - minY + padding * 2) * height;

  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.setLineDash([]);

  ctx.font = 'bold 12px monospace';
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY - 20, textWidth + 12, 19, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, boxX + 6, boxY - 5);

  const eyePadding = 0.014;
  const drawEyeBox = (
    outerA: NormalizedLandmark,
    outerB: NormalizedLandmark,
    inner: NormalizedLandmark,
    top: NormalizedLandmark,
    bottom: NormalizedLandmark
  ) => {
    const leftEdge = Math.min(outerA.x, outerB.x, inner.x);
    const rightEdge = Math.max(outerA.x, outerB.x, inner.x);
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      (leftEdge - eyePadding) * width,
      (top.y - eyePadding) * height,
      (rightEdge - leftEdge + eyePadding * 2) * width,
      (Math.abs(bottom.y - top.y) + eyePadding * 2) * height
    );
  };

  const leftOuterWide = L_EYE_OUTER2 < landmarks.length ? landmarks[L_EYE_OUTER2] : landmarks[L_EYE_OUTER];
  const rightOuterWide = R_EYE_OUTER2 < landmarks.length ? landmarks[R_EYE_OUTER2] : landmarks[R_EYE_OUTER];
  drawEyeBox(landmarks[L_EYE_OUTER], leftOuterWide, landmarks[L_EYE_INNER], landmarks[L_EYE_TOP], landmarks[L_EYE_BOTTOM]);
  drawEyeBox(landmarks[R_EYE_OUTER], rightOuterWide, landmarks[R_EYE_INNER], landmarks[R_EYE_TOP], landmarks[R_EYE_BOTTOM]);
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function waitForVideoElement(ref: MutableRefObject<HTMLVideoElement | null>) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (ref.current) return ref.current;
    await wait(50);
  }

  throw new Error('Camera preview element is not ready yet.');
}

async function waitForMetadata(video: HTMLVideoElement) {
  if (video.readyState >= 1) return;

  await new Promise<void>((resolve, reject) => {
    const handleLoaded = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error('Camera metadata did not load.'));
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for camera metadata.'));
    }, 4000);

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('error', handleError);
      window.clearTimeout(timeout);
    };

    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('error', handleError);
  });
}

export function useGazeTracking(): GazeTrackingReturn {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  const faceMeshRef = useRef<InstanceType<typeof FaceMesh> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopTimeoutRef = useRef<number | null>(null);
  const chimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);
  const startPromiseRef = useRef<Promise<void> | null>(null);

  const distractionStartRef = useRef<number | null>(null);
  const cooldownEndRef = useRef<number | null>(null);
  const isDistractedRef = useRef(false);
  const lastResultAtRef = useRef<number | null>(null);
  const lastReliableSignalAtRef = useRef<number | null>(null);
  const trackingStateRef = useRef<TrackingState>('inactive');

  const smoothRef = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });
  const gazeBaselineRef = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });
  const calibSamplesRef = useRef<{ x: number; y: number; yaw: number; pitch: number }[]>([]);
  const isCalibRef = useRef(false);
  const calibStartRef = useRef<number | null>(null);

  const [isTracking, setIsTracking] = useState(false);
  const [isDistracted, setIsDistracted] = useState(false);
  const [isLookingAway, setIsLookingAway] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [trackingState, setTrackingState] = useState<TrackingState>('inactive');
  const [distractionCount, setDistractionCount] = useState(0);
  const [focusTimeSeconds, setFocusTimeSeconds] = useState(0);
  const [distractionCountdownActive, setDistractionCountdownActive] = useState(false);
  const [distractionCountdownRemainingMs, setDistractionCountdownRemainingMs] = useState(0);
  const [distractionCountdownProgress, setDistractionCountdownProgress] = useState(0);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [alertDelay, setAlertDelay] = useState(5);
  const [alertSound, setAlertSound] = useState(true);
  const [alertFlash, setAlertFlash] = useState(true);
  const [gazeX, setGazeX] = useState(0);
  const [gazeY, setGazeY] = useState(0);

  const sensitivityRef = useRef(sensitivity);
  const alertDelayRef = useRef(alertDelay * 1000);
  const alertSoundRef = useRef(alertSound);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    alertDelayRef.current = alertDelay * 1000;
    if (!distractionCountdownActive) {
      setDistractionCountdownRemainingMs(alertDelay * 1000);
      setDistractionCountdownProgress(0);
    }
  }, [alertDelay, distractionCountdownActive]);

  useEffect(() => {
    alertSoundRef.current = alertSound;
  }, [alertSound]);

  const resetCountdown = useCallback(() => {
    setDistractionCountdownActive(false);
    setDistractionCountdownRemainingMs(alertDelayRef.current);
    setDistractionCountdownProgress(0);
  }, []);

  const setTrackingStateSafe = useCallback((nextState: TrackingState) => {
    trackingStateRef.current = nextState;
    setTrackingState(nextState);
  }, []);

  const stopChime = useCallback(() => {
    if (chimeIntervalRef.current !== null) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }
  }, []);

  const clearDistractionState = useCallback((cooldownFrom: number | null = null) => {
    distractionStartRef.current = null;
    resetCountdown();
    if (isDistractedRef.current) {
      stopChime();
      isDistractedRef.current = false;
      setIsDistracted(false);
      cooldownEndRef.current = cooldownFrom === null ? null : cooldownFrom + POST_ALARM_COOLDOWN;
    }
  }, [resetCountdown, stopChime]);

  useEffect(() => {
    if (!isTracking) return;

    const id = window.setInterval(() => {
      if (trackingStateRef.current === 'active' && !isDistractedRef.current) {
        setFocusTimeSeconds(seconds => seconds + 1);
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [isTracking]);

  const startChime = useCallback(() => {
    playAlertChime();
    chimeIntervalRef.current = setInterval(playAlertChime, 2000);
  }, []);

  const attachVideoStream = useCallback(async (video: HTMLVideoElement, stream: MediaStream) => {
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    await waitForMetadata(video);

    if (video.paused) {
      try {
        await video.play();
      } catch {
        // The next user interaction can retry playback if the browser blocks autoplay.
      }
    }
  }, []);

  const attachVideoRef = useCallback<RefCallback<HTMLVideoElement>>((node) => {
    videoElementRef.current = node;

    if (node && streamRef.current) {
      void attachVideoStream(node, streamRef.current);
    }
  }, [attachVideoStream]);

  const attachCanvasRef = useCallback<RefCallback<HTMLCanvasElement>>((node) => {
    canvasElementRef.current = node;
  }, []);

  const processFrame = useCallback(function processFrameLoop() {
    const scheduleNext = (delay = PROCESS_LOOP_DELAY_MS) => {
      loopTimeoutRef.current = window.setTimeout(processFrameLoop, delay);
    };

    const video = videoElementRef.current;
    if (!video || !faceMeshRef.current || video.readyState < 2) {
      scheduleNext();
      return;
    }

    if (processingRef.current) {
      scheduleNext();
      return;
    }

    processingRef.current = true;
    faceMeshRef.current
      .send({ image: video })
      .catch(() => {
        // Keep the loop alive even if MediaPipe drops a frame.
      })
      .finally(() => {
        processingRef.current = false;
        scheduleNext();
      });
  }, []);

  const onResults = useCallback((results: Results) => {
    const now = Date.now();
    lastResultAtRef.current = now;

    const hasFace = results.multiFaceLandmarks?.length > 0;
    setIsFaceDetected(hasFace);

    let landmarks: NormalizedLandmark[] | null = null;
    let lookReason: LookReason = 'focused';
    let reliableSignal = false;

    if (hasFace) {
      landmarks = results.multiFaceLandmarks[0];

      const rawGaze = getRawGaze(landmarks);
      const rawYaw = getRawYaw(landmarks);
      const rawPitch = getRawPitch(landmarks);

      if (rawGaze) {
        reliableSignal = true;

        smoothRef.current.x = SMOOTH_ALPHA * rawGaze.x + (1 - SMOOTH_ALPHA) * smoothRef.current.x;
        smoothRef.current.y = SMOOTH_ALPHA * rawGaze.y + (1 - SMOOTH_ALPHA) * smoothRef.current.y;
        smoothRef.current.yaw = SMOOTH_ALPHA * rawYaw + (1 - SMOOTH_ALPHA) * smoothRef.current.yaw;
        smoothRef.current.pitch = SMOOTH_ALPHA * rawPitch + (1 - SMOOTH_ALPHA) * smoothRef.current.pitch;

        const sx = smoothRef.current.x;
        const sy = smoothRef.current.y;
        const yaw = smoothRef.current.yaw;
        const pitch = smoothRef.current.pitch;

        setGazeX(sx);
        setGazeY(sy);

        if (isCalibRef.current) {
          if (calibStartRef.current === null) calibStartRef.current = now;
          const elapsed = now - calibStartRef.current;

          calibSamplesRef.current.push({ x: sx, y: sy, yaw, pitch });
          setCalibrationProgress(Math.min(elapsed / CALIBRATION_MS, 1));
          setTrackingStateSafe('calibrating');

          if (elapsed >= CALIBRATION_MS) {
            const sampleCount = calibSamplesRef.current.length || 1;
            const sum = calibSamplesRef.current.reduce(
              (acc, sample) => ({
                x: acc.x + sample.x,
                y: acc.y + sample.y,
                yaw: acc.yaw + sample.yaw,
                pitch: acc.pitch + sample.pitch,
              }),
              { x: 0, y: 0, yaw: 0, pitch: 0 }
            );

            gazeBaselineRef.current = {
              x: sum.x / sampleCount,
              y: sum.y / sampleCount,
              yaw: sum.yaw / sampleCount,
              pitch: sum.pitch / sampleCount,
            };
            isCalibRef.current = false;
            setIsCalibrating(false);
            setCalibrationProgress(1);
          }
        } else {
          const baselineX = gazeBaselineRef.current.x;
          const baselineY = gazeBaselineRef.current.y;
          const baselineYaw = gazeBaselineRef.current.yaw;
          const baselinePitch = gazeBaselineRef.current.pitch;

          const deadzone = 0.05 + (1 - sensitivityRef.current) * 0.35;
          const pitchDeadzone = 0.15 + (1 - sensitivityRef.current) * 0.25;

          const gazeOff = Math.abs(sx - baselineX) > deadzone || Math.abs(sy - baselineY) > deadzone;
          const headTurned = Math.abs(yaw - baselineYaw) > deadzone;
          const headDown = (pitch - baselinePitch) > pitchDeadzone;

          if (headDown) lookReason = 'pitch';
          else if (headTurned) lookReason = 'yaw';
          else if (gazeOff) lookReason = 'gaze';
          else lookReason = 'focused';

          if (lookReason === 'focused') {
            gazeBaselineRef.current.x += BASELINE_DRIFT * (sx - baselineX);
            gazeBaselineRef.current.y += BASELINE_DRIFT * (sy - baselineY);
            gazeBaselineRef.current.yaw += BASELINE_DRIFT * (yaw - baselineYaw);
            gazeBaselineRef.current.pitch += BASELINE_DRIFT * (pitch - baselinePitch);
          }

          lastReliableSignalAtRef.current = now;
          setTrackingStateSafe('active');
        }
      }
    }

    const hasReliableSignal = reliableSignal && !isCalibRef.current;
    const lookingAway = hasReliableSignal && lookReason !== 'focused';
    setIsLookingAway(lookingAway);

    const canvas = canvasElementRef.current;
    const video = videoElementRef.current;
    if (canvas && video && landmarks && hasReliableSignal) {
      const videoWidth = video.videoWidth || 640;
      const videoHeight = video.videoHeight || 480;
      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width = videoWidth;
        canvas.height = videoHeight;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) drawOverlay(ctx, videoWidth, videoHeight, landmarks, lookReason, isDistractedRef.current);
    } else if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (!hasReliableSignal) {
      clearDistractionState(now);
      if (isTracking && !isCalibRef.current) {
        setTrackingStateSafe('uncertain');
      }
      return;
    }

    if (!lookingAway) {
      clearDistractionState(now);
      return;
    }

    if (isDistractedRef.current) {
      setDistractionCountdownActive(true);
      setDistractionCountdownRemainingMs(0);
      setDistractionCountdownProgress(1);
      return;
    }

    const inCooldown = cooldownEndRef.current !== null && now < cooldownEndRef.current;
    if (inCooldown) {
      resetCountdown();
      return;
    }

    if (distractionStartRef.current === null) {
      distractionStartRef.current = now;
    }

    const elapsed = now - distractionStartRef.current;
    const remainingMs = Math.max(alertDelayRef.current - elapsed, 0);
    setDistractionCountdownActive(true);
    setDistractionCountdownRemainingMs(remainingMs);
    setDistractionCountdownProgress(clamp(elapsed / alertDelayRef.current, 0, 1));

    if (elapsed >= alertDelayRef.current) {
      isDistractedRef.current = true;
      setIsDistracted(true);
      setDistractionCount(count => count + 1);
      setDistractionCountdownRemainingMs(0);
      setDistractionCountdownProgress(1);
      if (alertSoundRef.current) startChime();
      distractionStartRef.current = null;
    }
  }, [clearDistractionState, isTracking, resetCountdown, setTrackingStateSafe, startChime]);

  useEffect(() => {
    if (!isTracking) {
      setTrackingStateSafe('inactive');
      return;
    }

    const id = window.setInterval(() => {
      const now = Date.now();

      if (isCalibRef.current) {
        setTrackingStateSafe('calibrating');
        return;
      }

      const lastResultAt = lastResultAtRef.current;
      const lastReliableAt = lastReliableSignalAtRef.current;
      const shouldBeUncertain =
        lastResultAt === null ||
        now - lastResultAt > UNCERTAIN_AFTER_MS ||
        lastReliableAt === null ||
        now - lastReliableAt > UNCERTAIN_AFTER_MS;

      if (shouldBeUncertain) {
        setTrackingStateSafe('uncertain');
        setIsLookingAway(false);
        clearDistractionState(now);
      }
    }, 500);

    return () => window.clearInterval(id);
  }, [clearDistractionState, isTracking, setTrackingStateSafe]);

  const startTracking = useCallback(async () => {
    if (startPromiseRef.current) {
      await startPromiseRef.current;
      return;
    }

    if (streamRef.current && faceMeshRef.current) {
      return;
    }

    const startPromise = (async () => {
      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: false,
        });

        const video = await waitForVideoElement(videoElementRef);
        streamRef.current = stream;
        await attachVideoStream(video, stream);

        const mesh = new FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
        });

        await mesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        mesh.onResults(onResults);
        faceMeshRef.current = mesh;

        smoothRef.current = { x: 0, y: 0, yaw: 0, pitch: 0 };
        gazeBaselineRef.current = { x: 0, y: 0, yaw: 0, pitch: 0 };
        calibSamplesRef.current = [];
        lastResultAtRef.current = null;
        lastReliableSignalAtRef.current = null;
        isDistractedRef.current = false;
        distractionStartRef.current = null;
        cooldownEndRef.current = null;
        isCalibRef.current = true;
        calibStartRef.current = null;

        setIsTracking(true);
        setIsDistracted(false);
        setIsLookingAway(false);
        setIsFaceDetected(false);
        setIsCalibrating(true);
        setCalibrationProgress(0);
        setTrackingStateSafe('calibrating');
        resetCountdown();

        loopTimeoutRef.current = window.setTimeout(processFrame, 0);
      } catch (error) {
        console.error('Failed to start tracking:', error);
        stream?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        alert('Could not access the webcam. Please allow camera permissions and try again.');
      } finally {
        startPromiseRef.current = null;
      }
    })();

    startPromiseRef.current = startPromise;
    await startPromise;
  }, [attachVideoStream, onResults, processFrame, resetCountdown, setTrackingStateSafe]);

  const stopTracking = useCallback(() => {
    if (loopTimeoutRef.current !== null) {
      window.clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }

    processingRef.current = false;
    stopChime();
    faceMeshRef.current?.close();
    faceMeshRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    startPromiseRef.current = null;

    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }

    const canvas = canvasElementRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    isDistractedRef.current = false;
    distractionStartRef.current = null;
    cooldownEndRef.current = null;
    lastResultAtRef.current = null;
    lastReliableSignalAtRef.current = null;
    trackingStateRef.current = 'inactive';
    isCalibRef.current = false;

    setIsTracking(false);
    setIsDistracted(false);
    setIsLookingAway(false);
    setIsFaceDetected(false);
    setIsCalibrating(false);
    setCalibrationProgress(0);
    setTrackingState('inactive');
    resetCountdown();
  }, [resetCountdown, stopChime]);

  const dismissAlert = useCallback(() => {
    clearDistractionState(Date.now());
  }, [clearDistractionState]);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    isTracking,
    isDistracted,
    isLookingAway,
    isCalibrating,
    calibrationProgress,
    isFaceDetected,
    trackingState,
    distractionCount,
    focusTimeSeconds,
    distractionCountdownActive,
    distractionCountdownRemainingMs,
    distractionCountdownProgress,
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
    videoRef: attachVideoRef,
    canvasRef: attachCanvasRef,
    gazeX,
    gazeY,
  };
}
