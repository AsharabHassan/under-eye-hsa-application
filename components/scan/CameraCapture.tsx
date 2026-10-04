"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, Check, RefreshCcw } from "lucide-react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import type { MediaType } from "@/store/wizard-store";
import { EYE_WINDOW, assessEyes, type EyeChecks } from "@/lib/eye-framing";
import { cn } from "@/lib/utils";

interface CameraCaptureProps {
  onCapture: (base64: string, mediaType: MediaType) => void;
  onError: (message: string) => void;
}

const CAMERA_START_TIMEOUT_MS = 8_000;
/** After this long without all checks passing, offer "Capture anyway". */
const CAPTURE_ANYWAY_AFTER_MS = 7_000;
const BOX_ASPECT = 4 / 5;
const CAMERA_FAILED =
  "We couldn't open the in-page camera here. Tap “Use camera” again to open your phone's own camera, or upload a photo.";

/**
 * True when the browser can run the live in-page preview. It cannot on plain
 * http, and often cannot inside the Instagram / Facebook in-app browsers that
 * ad traffic opens in — the caller falls back to the phone's native camera.
 */
export function inPageCameraAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/** On-device face tracking on the live video (VIDEO mode). Rejects if it can't load. */
async function loadLiveLandmarker(): Promise<FaceLandmarker> {
  const vision = await import("@mediapipe/tasks-vision");
  const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
  return vision.FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
  });
}

/**
 * Live front camera focused on the EYES: everything outside an eye window is
 * dimmed, the face is tracked on-device to check both eyes are in the window,
 * close enough for detail, open and level, and (where the phone supports it)
 * the camera's focus point is set between the eyes. Capture unlocks when the
 * checks pass, with "Capture anyway" after a few seconds so no one is stuck.
 */
export function CameraCapture({ onCapture, onError }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [checks, setChecks] = useState<EyeChecks | null>(null);
  const [allowAnyway, setAllowAnyway] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const watchdog = window.setTimeout(() => {
      if (cancelled || videoRef.current?.videoWidth) return;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onError(CAMERA_FAILED);
    }, CAMERA_START_TIMEOUT_MS);

    async function start() {
      try {
        if (!inPageCameraAvailable()) throw new Error("camera-unavailable");
        const stream = await navigator.mediaDevices.getUserMedia({
          // Higher resolution than the face app: the eyes are a small part of the frame.
          video: { facingMode: "user", width: { ideal: 1440 }, height: { ideal: 1800 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          window.clearTimeout(watchdog);
          setReady(true);
        }
      } catch {
        window.clearTimeout(watchdog);
        if (!cancelled) onError(CAMERA_FAILED);
      }
    }
    start();
    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onError]);

  // "Capture anyway" fallback once the camera has been up for a while.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setAllowAnyway(true), CAPTURE_ANYWAY_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  // Live eye tracking (~8 fps) + focus between the eyes where supported.
  // If the tracker can't load, `checks` stays null and capture is simply allowed.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let raf = 0;
    let lm: FaceLandmarker | null = null;
    let last = 0;
    let lastFocus = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const video = videoRef.current;
      if (!video || !lm || now - last < 120 || !video.videoWidth) return;
      last = now;
      try {
        const res = lm.detectForVideo(video, now);
        const c = assessEyes(res.faceLandmarks?.[0], video.videoWidth / video.videoHeight, BOX_ASPECT);
        setChecks(c);
        if (c.focus && now - lastFocus > 1500) {
          lastFocus = now;
          focusOn(streamRef.current, c.focus);
        }
      } catch {
        /* skip a frame */
      }
    };
    loadLiveLandmarker()
      .then((loaded) => {
        if (cancelled) return loaded.close();
        lm = loaded;
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        /* the camera still works without live guidance */
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lm?.close();
    };
  }, [ready]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1] ?? "";
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(base64, "image/jpeg");
  }

  const tracking = checks !== null;
  const ok = Boolean(checks?.ok);
  const canCapture = ready && (ok || !tracking || allowAnyway);
  const w = EYE_WINDOW;
  const items: [string, boolean][] = checks
    ? [
        ["Eyes in window", checks.inWindow],
        ["Close enough", checks.closeEnough],
        ["Eyes open", checks.open],
        ["Head level", checks.level],
      ]
    : [];

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-[4/5] w-full max-w-xs overflow-hidden rounded-[2rem] border border-peach/20 bg-white/[0.04] shadow-soft">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />

        {/* Dim everything except the eye window. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <mask id="eye-window">
              <rect width="100" height="100" fill="white" />
              <rect x={w.left * 100} y={w.top * 100} width={(w.right - w.left) * 100} height={(w.bottom - w.top) * 100} rx="6" fill="black" />
            </mask>
          </defs>
          <rect width="100" height="100" fill="rgba(20,14,8,0.55)" mask="url(#eye-window)" />
          <rect
            x={w.left * 100}
            y={w.top * 100}
            width={(w.right - w.left) * 100}
            height={(w.bottom - w.top) * 100}
            rx="6"
            fill="none"
            stroke={ok ? "#e1bd76" : "rgba(255,255,255,0.85)"}
            strokeWidth={ok ? 1.1 : 0.7}
            strokeDasharray={ok ? undefined : "2.5 2"}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <p
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm"
          style={{ top: `calc(${w.top * 100}% - 2.1rem)` }}
        >
          {checks ? checks.hint : "Line your eyes up here"}
        </p>

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            <RefreshCcw className="mr-2 animate-spin" size={16} /> Starting camera…
          </div>
        )}
      </div>

      {tracking && (
        <ul className="mt-4 flex flex-wrap justify-center gap-1.5" aria-live="polite">
          {items.map(([label, pass]) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                pass ? "border-peach/60 bg-peach/15 text-heading" : "border-white/15 text-body/60",
              )}
            >
              {pass && <Check size={11} strokeWidth={3} className="text-peach-deep" />}
              {label}
            </li>
          ))}
        </ul>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: canCapture ? 1 : 0.45 }}>
        <Button size="lg" className="mt-5" onClick={capture} disabled={!canCapture}>
          <Camera size={18} /> {ok || !tracking ? "Capture photo" : "Capture anyway"}
        </Button>
      </motion.div>
      <p className="mt-3 text-center text-xs text-body/60">
        Face a window or soft light, remove glasses, and look straight at the camera.
      </p>
    </div>
  );
}

/** Point the camera's focus at the eyes on phones that support it (Chrome/Android). */
function focusOn(stream: MediaStream | null, p: { x: number; y: number }) {
  const track = stream?.getVideoTracks()[0];
  if (!track?.getCapabilities) return;
  const caps = track.getCapabilities() as MediaTrackCapabilities & {
    pointsOfInterest?: unknown;
    focusMode?: string[];
  };
  const advanced: Record<string, unknown> = {};
  if ("pointsOfInterest" in caps) advanced.pointsOfInterest = [{ x: p.x, y: p.y }];
  if (caps.focusMode?.includes("continuous")) advanced.focusMode = "continuous";
  if (!Object.keys(advanced).length) return;
  track.applyConstraints({ advanced: [advanced as MediaTrackConstraintSet] }).catch(() => {
    /* unsupported on this device — ignore */
  });
}
