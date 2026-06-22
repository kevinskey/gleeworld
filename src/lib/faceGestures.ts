// Lightweight head-turn gesture detector using MediaPipe Tasks Vision
// FaceLandmarker. The model + WASM are pulled lazily from Google's CDN
// the first time the user enables gestures (≈8MB total). We only watch
// the nose-tip landmark — head-turn-right (nose moves right of a moving
// average) → onNext, head-turn-left → onPrev. Cooldown prevents back-to-back
// triggers from a single sustained turn.

let vision: any = null;
let landmarker: any = null;
let stream: MediaStream | null = null;
let video: HTMLVideoElement | null = null;
let rafId: number | null = null;
let lastTriggerAt = 0;
let smoothedX = 0;
let smoothedXInit = false;

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';

export interface GestureOptions {
  onNext: () => void;
  onPrev: () => void;
  sensitivity: number; // 0..1; higher = smaller head turn triggers
}

export async function startFaceGestures(opts: GestureOptions): Promise<void> {
  if (rafId !== null) await stopFaceGestures();

  if (!vision) {
    const mod = await import(/* @vite-ignore */ `${CDN_BASE}/vision_bundle.mjs`);
    vision = mod;
  }
  if (!landmarker) {
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(`${CDN_BASE}/wasm`);
    landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
    });
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 320, height: 240 },
    audio: false,
  });
  video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  const threshold = 0.12 - opts.sensitivity * 0.08; // sens 1 → 0.04, sens 0 → 0.12
  const COOLDOWN_MS = 1200;

  const tick = () => {
    if (!landmarker || !video) return;
    const now = performance.now();
    const result = landmarker.detectForVideo(video, now);
    const lm = result?.faceLandmarks?.[0];
    if (lm) {
      // Landmark index 1 is the nose tip. Normalized 0..1 image coords.
      const noseX = lm[1].x;
      if (!smoothedXInit) { smoothedX = noseX; smoothedXInit = true; }
      else smoothedX = smoothedX * 0.92 + noseX * 0.08;
      const delta = noseX - smoothedX;
      if (now - lastTriggerAt > COOLDOWN_MS) {
        // Note: camera flips horizontally in selfie view. Turning your
        // head to YOUR right pushes the nose LEFT in the raw frame; we
        // map that to "next" so the gesture feels natural.
        if (delta < -threshold) { opts.onNext(); lastTriggerAt = now; }
        else if (delta > threshold) { opts.onPrev(); lastTriggerAt = now; }
      }
    }
    rafId = window.requestAnimationFrame(tick);
  };
  rafId = window.requestAnimationFrame(tick);
}

export async function stopFaceGestures(): Promise<void> {
  if (rafId !== null) { window.cancelAnimationFrame(rafId); rafId = null; }
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  if (video) { try { video.pause(); } catch {} video = null; }
  smoothedXInit = false;
}
