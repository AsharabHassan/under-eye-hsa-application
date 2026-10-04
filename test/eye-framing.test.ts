import { describe, expect, it } from "vitest";
import { assessEyes, toDisplay, type Pt } from "@/lib/eye-framing";

/** A synthetic 478-point face with eyes at the given display-space geometry (4:5 video = box). */
function face({ cy = 0.41, span = 0.6, openness = 0.3, tilt = 0 }: { cy?: number; span?: number; openness?: number; tilt?: number } = {}): Pt[] {
  const pts: Pt[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.6 }));
  const half = span / 2;
  const eyeW = span * 0.28;
  const set = (i: number, x: number, y: number) => (pts[i] = { x, y });
  const dy = Math.tan((tilt * Math.PI) / 180) * half;
  // image-left eye (33 outer, 133 inner), image-right eye (263 outer, 362 inner)
  set(33, 0.5 - half, cy - dy); set(133, 0.5 - half + eyeW, cy - dy);
  set(159, 0.5 - half + eyeW / 2, cy - dy - (openness * eyeW) / 2); set(145, 0.5 - half + eyeW / 2, cy - dy + (openness * eyeW) / 2);
  set(263, 0.5 + half, cy + dy); set(362, 0.5 + half - eyeW, cy + dy);
  set(386, 0.5 + half - eyeW / 2, cy + dy - (openness * eyeW) / 2); set(374, 0.5 + half - eyeW / 2, cy + dy + (openness * eyeW) / 2);
  return pts;
}

describe("assessEyes", () => {
  it("passes a well-framed, open, level pair of eyes", () => {
    const r = assessEyes(face(), 0.8, 0.8);
    expect(r).toMatchObject({ ok: true, inWindow: true, closeEnough: true, open: true, level: true });
    expect(r.hint).toMatch(/hold still/i);
  });
  it("asks to come closer when the eyes are small in frame", () => {
    expect(assessEyes(face({ span: 0.3 }), 0.8, 0.8)).toMatchObject({ ok: false, hint: "Move a little closer" });
  });
  it("asks to move back when far too close", () => {
    expect(assessEyes(face({ span: 0.9 }), 0.8, 0.8).hint).toBe("Move back slightly");
  });
  it("flags eyes outside the window", () => {
    expect(assessEyes(face({ cy: 0.7 }), 0.8, 0.8)).toMatchObject({ inWindow: false, ok: false });
  });
  it("flags closed eyes and a tilted head", () => {
    expect(assessEyes(face({ openness: 0.05 }), 0.8, 0.8).open).toBe(false);
    expect(assessEyes(face({ tilt: 15 }), 0.8, 0.8).level).toBe(false);
  });
  it("handles no face", () => {
    expect(assessEyes(null, 0.8, 0.8)).toMatchObject({ found: false, ok: false });
  });
  it("maps object-cover cropping for a landscape stream", () => {
    // 4:3 landscape stream in a 4:5 box: only the middle 60% of the width shows.
    const p = toDisplay({ x: 0.5, y: 0.4 }, 4 / 3, 0.8);
    expect(p.x).toBeCloseTo(0.5);
    expect(toDisplay({ x: 0.2, y: 0.4 }, 4 / 3, 0.8).x).toBeCloseTo(0);
  });
});
