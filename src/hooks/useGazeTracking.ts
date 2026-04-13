import { useEffect, useRef, useState, useCallback } from 'react';
import type { Results, NormalizedLandmark } from '@mediapipe/face_mesh';

// MediaPipe is loaded via CDN script tag in index.html and exposed on window.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FaceMesh = (window as any).FaceMesh as new (opts: { locateFile: (f: string) => string }) => {
  setOptions: (o: Record<string, unknown>) => Promise<void>;
  onResults: (cb: (r: Results) => void) => void;
  send: (i: { image: HTMLVideoElement }) => Promise<void>;
  close: () => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────
export const DISTRACTION_THRESHOLD = 5000; // ms looking away before alarm fires

// Cooldown after alarm clears — prevents jitter from immediately re-triggering.
const POST_ALARM_COOLDOWN = 2500;

// EMA smoothing factor: 0 = frozen, 1 = raw. 0.55 = snappy but jitter-free.
const SMOOTH_ALPHA = 0.55;

// How long to collect baseline samples at session start (ms).
const CALIBRATION_MS = 2500;

// How quickly the baseline drifts toward the current smoothed value while focused.
// 0.003 per frame ≈ 4.5% per second at 15 fps — corrects slow head-position drift
// without chasing genuine look-away movements.
const BASELINE_DRIFT = 0.003;

// MediaPipe landmark indices
const IRIS_LEFT    = 468;
const IRIS_RIGHT   = 473;
const L_EYE_INNER  = 133;
const L_EYE_OUTER  = 33;
const L_EYE_OUTER2 = 130; // wider outer point for better box
const L_EYE_TOP    = 159;
const L_EYE_BOTTOM = 145;
const R_EYE_INNER  = 362;
const R_EYE_OUTER  = 263;
const R_EYE_OUTER2 = 359;
const R_EYE_TOP    = 386;
const R_EYE_BOTTOM = 374;
const NOSE_TIP     = 1;
const LEFT_EAR     = 234;
const RIGHT_EAR    = 454;
const FOREHEAD     = 10;  // top-center of forehead
const CHIN         = 152; // bottom-center of chin

// ─── Types ────────────────────────────────────────────────────────────────────
export interface GazeTrackingReturn {
  isTracking: boolean;
  isDistracted: boolean;
  isLookingAway: boolean;
  // calibration
  isCalibrating: boolean;
  calibrationProgress: number; // 0–1
  isFaceDetected: boolean;
  distractionCount: number;
  focusTimeSeconds: number;
  // detection sensitivity
  sensitivity: number;
  setSensitivity: (v: number) => void;
  // alert preferences
  alertDelay: number;
  setAlertDelay: (v: number) => void;
  alertSound: boolean;
  setAlertSound: (v: boolean) => void;
  alertFlash: boolean;
  setAlertFlash: (v: boolean) => void;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  dismissAlert: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gazeX: number;
  gazeY: number;
}

// ─── Audio ────────────────────────────────────────────────────────────────────
function playAlertChime() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  } catch { /* AudioContext not available */ }
}

// ─── Gaze math ────────────────────────────────────────────────────────────────

/**
 * Horizontal/vertical iris position within each eye socket, averaged across both eyes.
 *
 * Key fix over the previous version: use the EYE CENTRE (not inner corner) as the
 * reference so that looking straight ahead always returns (0, 0).
 *
 * The left and right eye irises move in OPPOSITE directions in image-space for the
 * same real-world gaze direction (e.g. both eyes look right → left iris x increases,
 * right iris x decreases).  We correct for this by NEGATING the right eye's X offset
 * before averaging, so both contribute the same sign.
 *
 * Y does not need negation because both irises move in the same image-space direction
 * (both increase in y when looking down).
 */
function getRawGaze(lm: NormalizedLandmark[]): { x: number; y: number } | null {
  if (lm.length <= IRIS_RIGHT) return null;

  const irisL = lm[IRIS_LEFT];
  const irisR = lm[IRIS_RIGHT];

  // ── Left eye ──────────────────────────────────────────────────────────────
  const lOuter  = lm[L_EYE_OUTER];
  const lInner  = lm[L_EYE_INNER];
  const lTop    = lm[L_EYE_TOP];
  const lBot    = lm[L_EYE_BOTTOM];
  const lCenterX = (lOuter.x + lInner.x) / 2;
  const lCenterY = (lTop.y   + lBot.y)   / 2;
  const lHalfW   = Math.abs(lOuter.x - lInner.x) / 2 || 0.001;
  const lHalfH   = Math.abs(lBot.y   - lTop.y)   / 2 || 0.001;

  // Positive x → iris right of centre (looking camera-right / person's left)
  const gLx = (irisL.x - lCenterX) / lHalfW;
  // Positive y → iris below centre (looking down)
  const gLy = (irisL.y - lCenterY) / lHalfH;

  // ── Right eye ─────────────────────────────────────────────────────────────
  const rOuter  = lm[R_EYE_OUTER];
  const rInner  = lm[R_EYE_INNER];
  const rTop    = lm[R_EYE_TOP];
  const rBot    = lm[R_EYE_BOTTOM];
  const rCenterX = (rOuter.x + rInner.x) / 2;
  const rCenterY = (rTop.y   + rBot.y)   / 2;
  const rHalfW   = Math.abs(rOuter.x - rInner.x) / 2 || 0.001;
  const rHalfH   = Math.abs(rBot.y   - rTop.y)   / 2 || 0.001;

  // Negate X: right iris moves opposite to left iris in image-space for same gaze
  const gRx = -(irisR.x - rCenterX) / rHalfW;
  const gRy =  (irisR.y - rCenterY) / rHalfH;

  return { x: (gLx + gRx) / 2, y: (gLy + gRy) / 2 };
}

/** Head yaw (left/right turn): 0 = straight, positive = turned right in image. */
function getRawYaw(lm: NormalizedLandmark[]): number {
  const nose      = lm[NOSE_TIP];
  const leftEar   = lm[LEFT_EAR];
  const rightEar  = lm[RIGHT_EAR];
  const faceWidth = Math.abs(rightEar.x - leftEar.x) || 0.001;
  const noseMid   = (leftEar.x + rightEar.x) / 2;
  return (nose.x - noseMid) / faceWidth;
}

/**
 * Head pitch (up/down tilt) using Z-depth of chin vs forehead.
 *
 * When the head tilts DOWN (student looks at phone/desk):
 *   - Forehead comes toward the camera → smaller (more negative) z
 *   - Chin goes away from the camera  → larger  (more positive) z
 *   - (chinZ − foreheadZ) > 0  → positive pitch = looking down  ✓
 *
 * When the head tilts UP:
 *   - (chinZ − foreheadZ) < 0  → negative pitch                  ✓
 *
 * Normalised by face width so the value is scale-independent.
 */
function getRawPitch(lm: NormalizedLandmark[]): number {
  const faceW = Math.abs(lm[LEFT_EAR].x - lm[RIGHT_EAR].x) || 0.1;
  return (lm[CHIN].z - lm[FOREHEAD].z) / faceW;
}

type LookReason = 'focused' | 'gaze' | 'yaw' | 'pitch';

// ─── Canvas overlay ───────────────────────────────────────────────────────────
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lm: NormalizedLandmark[],
  lookReason: LookReason,
  isDistracted: boolean
) {
  ctx.clearRect(0, 0, w, h);

  const lookingAway = lookReason !== 'focused';
  const mainColor = isDistracted ? '#ef4444' : lookingAway ? '#f97316' : '#22c55e';
  const eyeColor  = isDistracted ? '#f87171' : lookingAway ? '#fb923c' : '#34d399';
  const label = isDistracted
    ? '⚠ DISTRACTED'
    : lookReason === 'pitch' ? '↓ LOOKING DOWN'
    : lookReason === 'yaw'   ? '↔ HEAD TURNED'
    : lookReason === 'gaze'  ? '● EYES AWAY'
    : '✓ FOCUSED';

  // ── Face bounding box ──
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of lm) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = 0.015;
  const bx = (minX - pad) * w;
  const by = (minY - pad) * h;
  const bw = (maxX - minX + 2 * pad) * w;
  const bh = (maxY - minY + 2 * pad) * h;

  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(bx, by, bw, bh);
  ctx.setLineDash([]);

  // Corner accents
  const cs: [number, number, number, number][] = [
    [bx,      by,      +bw * 0.1, +bh * 0.1],
    [bx + bw, by,      -bw * 0.1, +bh * 0.1],
    [bx,      by + bh, +bw * 0.1, -bh * 0.1],
    [bx + bw, by + bh, -bw * 0.1, -bh * 0.1],
  ];
  ctx.lineWidth = 3;
  for (const [cx, cy, dxH, dyV] of cs) {
    ctx.beginPath();
    ctx.moveTo(cx + dxH, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dyV);
    ctx.stroke();
  }

  // Label badge
  ctx.font = 'bold 12px monospace';
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.roundRect(bx, by - 20, tw + 12, 19, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, bx + 6, by - 5);

  // ── Eye boxes ──
  const ep = 0.014;
  const drawEyeBox = (
    outerA: NormalizedLandmark, outerB: NormalizedLandmark,
    inner: NormalizedLandmark,  top: NormalizedLandmark,
    bottom: NormalizedLandmark
  ) => {
    const leftEdge  = Math.min(outerA.x, outerB.x, inner.x);
    const rightEdge = Math.max(outerA.x, outerB.x, inner.x);
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      (leftEdge - ep) * w,
      (top.y    - ep) * h,
      (rightEdge - leftEdge + ep * 2) * w,
      (Math.abs(bottom.y - top.y) + ep * 2) * h
    );
  };

  const lo2 = L_EYE_OUTER2 < lm.length ? lm[L_EYE_OUTER2] : lm[L_EYE_OUTER];
  const ro2 = R_EYE_OUTER2 < lm.length ? lm[R_EYE_OUTER2] : lm[R_EYE_OUTER];
  drawEyeBox(lm[L_EYE_OUTER], lo2, lm[L_EYE_INNER], lm[L_EYE_TOP], lm[L_EYE_BOTTOM]);
  drawEyeBox(lm[R_EYE_OUTER], ro2, lm[R_EYE_INNER], lm[R_EYE_TOP], lm[R_EYE_BOTTOM]);

  // ── Iris rings + gaze direction line ──
  if (lm.length > IRIS_RIGHT) {
    const drawIris = (
      iris: NormalizedLandmark,
      outer: NormalizedLandmark, inner: NormalizedLandmark,
      top: NormalizedLandmark,   bottom: NormalizedLandmark
    ) => {
      const ecx = (outer.x + inner.x) / 2;
      const ecy = (top.y  + bottom.y) / 2;
      const r   = Math.max(Math.abs(outer.x - inner.x) * w * 0.4, 6);

      // Iris ring
      ctx.beginPath();
      ctx.arc(iris.x * w, iris.y * h, r, 0, Math.PI * 2);
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pupil dot
      ctx.beginPath();
      ctx.arc(iris.x * w, iris.y * h, Math.max(r * 0.3, 2.5), 0, Math.PI * 2);
      ctx.fillStyle = eyeColor;
      ctx.fill();

      // Gaze direction arrow from eye centre to iris
      ctx.beginPath();
      ctx.moveTo(ecx * w, ecy * h);
      ctx.lineTo(ecx * w + (iris.x - ecx) * w * 3, ecy * h + (iris.y - ecy) * h * 3);
      ctx.strokeStyle = eyeColor + 'aa';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    drawIris(lm[IRIS_LEFT],  lm[L_EYE_OUTER], lm[L_EYE_INNER], lm[L_EYE_TOP], lm[L_EYE_BOTTOM]);
    drawIris(lm[IRIS_RIGHT], lm[R_EYE_OUTER], lm[R_EYE_INNER], lm[R_EYE_TOP], lm[R_EYE_BOTTOM]);
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGazeTracking(): GazeTrackingReturn {
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const faceMeshRef         = useRef<InstanceType<typeof FaceMesh> | null>(null);
  const streamRef           = useRef<MediaStream | null>(null);
  const rafRef              = useRef<number | null>(null);
  const chimeIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // State-machine refs — safe to read inside onResults without stale closure issues
  const distractionStartRef = useRef<number | null>(null); // when looking-away started
  const cooldownEndRef      = useRef<number | null>(null); // alarm can't re-fire before this
  const isDistractedRef     = useRef(false);

  // EMA smoothed gaze + head orientation
  const smoothRef = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });

  // Calibration state
  const [isCalibrating,      setIsCalibrating]      = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // Calibration refs
  const gazeBaselineRef  = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });
  const calibSamplesRef  = useRef<{ x: number; y: number; yaw: number; pitch: number }[]>([]);
  const isCalibRef       = useRef(false); // true while collecting baseline
  const calibStartRef    = useRef<number | null>(null);

  const [isTracking,       setIsTracking]       = useState(false);
  const [isDistracted,     setIsDistracted]     = useState(false);
  const [isLookingAway,    setIsLookingAway]    = useState(false);
  const [isFaceDetected,   setIsFaceDetected]   = useState(false);
  const [distractionCount, setDistractionCount] = useState(0);
  const [focusTimeSeconds, setFocusTimeSeconds] = useState(0);
  const [sensitivity,      setSensitivity]      = useState(0.5);
  const [alertDelay,       setAlertDelay]       = useState(5);    // seconds
  const [alertSound,       setAlertSound]       = useState(true);
  const [alertFlash,       setAlertFlash]       = useState(true);
  const [gazeX,            setGazeX]            = useState(0);
  const [gazeY,            setGazeY]            = useState(0);

  const sensitivityRef  = useRef(sensitivity);
  const alertDelayRef   = useRef(alertDelay * 1000); // stored as ms
  const alertSoundRef   = useRef(alertSound);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { alertDelayRef.current  = alertDelay * 1000; }, [alertDelay]);
  useEffect(() => { alertSoundRef.current  = alertSound; }, [alertSound]);

  // Focus timer
  useEffect(() => {
    if (!isTracking) return;
    const id = setInterval(() => {
      if (!isDistractedRef.current) setFocusTimeSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isTracking]);

  const startChime = useCallback(() => {
    playAlertChime();
    chimeIntervalRef.current = setInterval(playAlertChime, 2000);
  }, []);

  const stopChime = useCallback(() => {
    if (chimeIntervalRef.current !== null) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !faceMeshRef.current || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }
    faceMeshRef.current.send({ image: video }).then(() => {
      rafRef.current = requestAnimationFrame(processFrame);
    }).catch(() => {
      rafRef.current = requestAnimationFrame(processFrame);
    });
  }, []);

  const onResults = useCallback((results: Results) => {
    const hasFace = results.multiFaceLandmarks?.length > 0;
    setIsFaceDetected(hasFace);

    let lm: NormalizedLandmark[] | null = null;
    let lookReason: LookReason = hasFace ? 'focused' : 'gaze';

    if (hasFace) {
      lm = results.multiFaceLandmarks[0];

      const rawGaze  = getRawGaze(lm);
      const rawYaw   = getRawYaw(lm);
      const rawPitch = getRawPitch(lm);

      // EMA: blend each raw signal toward the running average
      if (rawGaze) {
        smoothRef.current.x = SMOOTH_ALPHA * rawGaze.x + (1 - SMOOTH_ALPHA) * smoothRef.current.x;
        smoothRef.current.y = SMOOTH_ALPHA * rawGaze.y + (1 - SMOOTH_ALPHA) * smoothRef.current.y;
      }
      smoothRef.current.yaw   = SMOOTH_ALPHA * rawYaw   + (1 - SMOOTH_ALPHA) * smoothRef.current.yaw;
      smoothRef.current.pitch = SMOOTH_ALPHA * rawPitch + (1 - SMOOTH_ALPHA) * smoothRef.current.pitch;

      const sx    = smoothRef.current.x;
      const sy    = smoothRef.current.y;
      const yaw   = smoothRef.current.yaw;
      const pitch = smoothRef.current.pitch;

      setGazeX(sx);
      setGazeY(sy);

      // ── Calibration phase ──────────────────────────────────────────────────
      if (isCalibRef.current) {
        const now = Date.now();
        if (calibStartRef.current === null) calibStartRef.current = now;
        const elapsed = now - calibStartRef.current;

        // Accumulate sample
        calibSamplesRef.current.push({ x: sx, y: sy, yaw, pitch });

        // Update progress (0→1)
        const progress = Math.min(elapsed / CALIBRATION_MS, 1);
        setCalibrationProgress(progress);

        if (elapsed >= CALIBRATION_MS) {
          // Compute mean of all samples as the personal baseline
          const n = calibSamplesRef.current.length || 1;
          const sum = calibSamplesRef.current.reduce(
            (acc, s) => ({ x: acc.x + s.x, y: acc.y + s.y, yaw: acc.yaw + s.yaw, pitch: acc.pitch + s.pitch }),
            { x: 0, y: 0, yaw: 0, pitch: 0 }
          );
          gazeBaselineRef.current = {
            x:     sum.x     / n,
            y:     sum.y     / n,
            yaw:   sum.yaw   / n,
            pitch: sum.pitch / n,
          };
          isCalibRef.current = false;
          setIsCalibrating(false);
          setCalibrationProgress(1);
        }
        // During calibration always report focused — never trigger alerts
        lookReason = 'focused';
      } else {
        // ── Normal detection — relative to personal baseline ─────────────────
        const bx    = gazeBaselineRef.current.x;
        const by    = gazeBaselineRef.current.y;
        const byaw  = gazeBaselineRef.current.yaw;
        const bpitch = gazeBaselineRef.current.pitch;

        // sensitivity 0.1 → deadzone 0.05 (strict), 1.0 → deadzone 0.40 (lenient)
        const deadzone      = 0.05 + (1 - sensitivityRef.current) * 0.35;
        // Pitch needs a wider deadzone — small head nods are normal while studying
        const pitchDeadzone = 0.15 + (1 - sensitivityRef.current) * 0.25;

        const gazeOff    = Math.abs(sx - bx) > deadzone || Math.abs(sy - by) > deadzone;
        const headTurned = Math.abs(yaw - byaw) > deadzone;
        const headDown   = (pitch - bpitch) > pitchDeadzone; // only DOWN counts

        // Priority: pitch (most deliberate) → yaw → gaze
        if (headDown)        lookReason = 'pitch';
        else if (headTurned) lookReason = 'yaw';
        else if (gazeOff)    lookReason = 'gaze';
        else                 lookReason = 'focused';

        // Slow baseline drift toward current position while user is focused —
        // corrects for gradual head position changes (leaning back, slight tilt)
        if (lookReason === 'focused') {
          gazeBaselineRef.current.x     += BASELINE_DRIFT * (sx    - bx);
          gazeBaselineRef.current.y     += BASELINE_DRIFT * (sy    - by);
          gazeBaselineRef.current.yaw   += BASELINE_DRIFT * (yaw   - byaw);
          gazeBaselineRef.current.pitch += BASELINE_DRIFT * (pitch - bpitch);
        }
      }
    }

    const lookingAway = lookReason !== 'focused';

    // Immediate indicator for camera border / status badge
    setIsLookingAway(lookingAway);

    // Draw overlay
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (canvas && video && lm) {
      const vw = video.videoWidth  || 640;
      const vh = video.videoHeight || 480;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width  = vw;
        canvas.height = vh;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) drawOverlay(ctx, vw, vh, lm, lookReason, isDistractedRef.current);
    } else if (canvas && !lm) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // ── State machine ─────────────────────────────────────────────────────────
    const now = Date.now();

    if (!lookingAway) {
      // ── User is looking at the screen ──────────────────────────────────────
      distractionStartRef.current = null; // reset look-away timer immediately

      if (isDistractedRef.current) {
        // IMMEDIATELY clear the alarm — no delay, no hysteresis
        stopChime();
        isDistractedRef.current = false;
        setIsDistracted(false);
        // Start cooldown so jitter can't re-fire right away
        cooldownEndRef.current = now + POST_ALARM_COOLDOWN;
      }
    } else {
      // ── User is looking away ───────────────────────────────────────────────
      if (!isDistractedRef.current) {
        // Don't fire during cooldown (prevents bounce right after alarm clears)
        const inCooldown = cooldownEndRef.current !== null && now < cooldownEndRef.current;
        if (!inCooldown) {
          if (distractionStartRef.current === null) {
            distractionStartRef.current = now;
          } else if (now - distractionStartRef.current >= alertDelayRef.current) {
            isDistractedRef.current = true;
            setIsDistracted(true);
            setDistractionCount(c => c + 1);
            if (alertSoundRef.current) startChime();
            distractionStartRef.current = null;
          }
        }
      }
      // If alarm is already firing, do nothing — just wait for user to look back
    }
  }, [startChime, stopChime]);

  const startTracking = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

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

      // Reset everything
      smoothRef.current           = { x: 0, y: 0, yaw: 0, pitch: 0 };
      isDistractedRef.current     = false;
      distractionStartRef.current = null;
      cooldownEndRef.current      = null;

      // Reset calibration
      gazeBaselineRef.current  = { x: 0, y: 0, yaw: 0, pitch: 0 };
      calibSamplesRef.current  = [];
      isCalibRef.current       = true;
      calibStartRef.current    = null;
      setIsCalibrating(true);
      setCalibrationProgress(0);

      setIsTracking(true);
      setIsDistracted(false);
      setIsLookingAway(false);

      rafRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('Failed to start tracking:', err);
      alert('Could not access webcam. Please allow camera permissions and try again.');
    }
  }, [onResults, processFrame]);

  const stopTracking = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stopChime();
    faceMeshRef.current?.close();
    faceMeshRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    isDistractedRef.current     = false;
    distractionStartRef.current = null;
    cooldownEndRef.current      = null;

    setIsTracking(false);
    setIsDistracted(false);
    setIsLookingAway(false);
    setIsFaceDetected(false);
  }, [stopChime]);

  // Manual dismiss — clears the alarm immediately regardless of gaze state.
  // Starts the cooldown so tracking can't re-fire right away.
  const dismissAlert = useCallback(() => {
    if (isDistractedRef.current) {
      stopChime();
      isDistractedRef.current     = false;
      distractionStartRef.current = null;
      cooldownEndRef.current      = Date.now() + POST_ALARM_COOLDOWN;
      setIsDistracted(false);
    }
  }, [stopChime]);

  useEffect(() => {
    return () => { stopTracking(); };
  }, [stopTracking]);

  return {
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
  };
}
