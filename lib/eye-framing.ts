// ─────────────────────────────────────────────────────────────────────────────
// Live "eyes in focus" framing check for the camera. Pure — takes MediaPipe face
// landmarks (normalised to the VIDEO frame) and the visible part of that frame
// (the preview is object-cover cropped), and says whether both eyes sit inside
// the on-screen eye window, close enough for detail, open and level.
// ─────────────────────────────────────────────────────────────────────────────

export interface Pt {
  x: number;
  y: number;
}

/** Eye window in DISPLAY coordinates (0–1 of the preview box). */
export const EYE_WINDOW = { top: 0.3, bottom: 0.52, left: 0.08, right: 0.92 } as const;

// MediaPipe FaceMesh indices: outer/inner corners and upper/lower lid centres.
const L = { outer: 33, inner: 133, top: 159, bottom: 145 };
const R = { outer: 263, inner: 362, top: 386, bottom: 374 };

export interface EyeChecks {
  found: boolean;
  inWindow: boolean;
  closeEnough: boolean;
  tooClose: boolean;
  open: boolean;
  level: boolean;
  ok: boolean;
  hint: string;
  /** Midpoint between the eyes in VIDEO coordinates (for camera focus). */
  focus: Pt | null;
}

/**
 * Map a video-normalised point to the object-cover preview box.
 * `videoAspect` = width/height of the stream, `boxAspect` = width/height of the box.
 */
export function toDisplay(p: Pt, videoAspect: number, boxAspect: number): Pt {
  if (videoAspect > boxAspect) {
    const s = boxAspect / videoAspect; // visible fraction of the width
    return { x: (p.x - (1 - s) / 2) / s, y: p.y };
  }
  const s = videoAspect / boxAspect; // visible fraction of the height
  return { x: p.x, y: (p.y - (1 - s) / 2) / s };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function assessEyes(
  landmarks: Pt[] | null | undefined,
  videoAspect: number,
  boxAspect: number,
): EyeChecks {
  const none: EyeChecks = {
    found: false, inWindow: false, closeEnough: false, tooClose: false, open: false, level: false, ok: false,
    hint: "Bring your face into view", focus: null,
  };
  if (!landmarks || landmarks.length < 400) return none;
  const d = (i: number) => toDisplay(landmarks[i], videoAspect, boxAspect);

  const lc = mid(d(L.outer), d(L.inner));
  const rc = mid(d(R.outer), d(R.inner));
  const span = dist(d(L.outer), d(R.outer)); // outer corner to outer corner
  const w = EYE_WINDOW;
  const inside = (p: Pt) => p.x > w.left && p.x < w.right && p.y > w.top + 0.02 && p.y < w.bottom - 0.02;
  const inWindow = inside(lc) && inside(rc);
  const closeEnough = span >= 0.46;
  const tooClose = span > 0.86;
  // Eye aspect ratio: lid opening vs eye width (both in video space — same scale).
  const ear = (e: typeof L) =>
    dist(landmarks[e.top], landmarks[e.bottom]) / Math.max(1e-6, dist(landmarks[e.outer], landmarks[e.inner]));
  const open = ear(L) > 0.18 && ear(R) > 0.18;
  const tilt = Math.abs((Math.atan2(rc.y - lc.y, rc.x - lc.x) * 180) / Math.PI);
  const level = Math.min(tilt, 180 - tilt) < 7;

  const hint = !inWindow
    ? "Line your eyes up inside the window"
    : tooClose
      ? "Move back slightly"
      : !closeEnough
        ? "Move a little closer"
        : !open
          ? "Open your eyes and look at the camera"
          : !level
            ? "Keep your head level"
            : "Perfect — hold still";
  const ok = inWindow && closeEnough && !tooClose && open && level;
  const vm = mid(mid(landmarks[L.outer], landmarks[L.inner]), mid(landmarks[R.outer], landmarks[R.inner]));
  return { found: true, inWindow, closeEnough: closeEnough && !tooClose, tooClose, open, level, ok, hint, focus: vm };
}
