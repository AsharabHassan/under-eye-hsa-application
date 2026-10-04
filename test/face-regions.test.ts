import { describe, it, expect } from "vitest";
import {
  regionRect,
  regionEllipse,
  faceVisibleSide,
  SIDE_ORDER,
  SIDE_LABEL,
} from "@/lib/face-regions";
import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";

// Synthetic 478-point mesh: a plausible oval face spread so every region's
// indices land inside (0,1). Not anatomically exact — the geometry layer only
// needs a bounding box per index group.
function syntheticLandmarks(): NormalizedPoint[] {
  const pts: NormalizedPoint[] = [];
  for (let i = 0; i < 478; i++) {
    const a = (i * 137.508) % 360; // golden-angle spread
    const rad = 0.12 + ((i * 7919) % 100) / 100 * 0.18;
    pts.push({
      x: 0.5 + Math.cos((a * Math.PI) / 180) * rad,
      y: 0.45 + Math.sin((a * Math.PI) / 180) * rad * 1.25,
      z: 0,
    });
  }
  return pts;
}

describe("face-regions under-eye areas", () => {
  const landmarks = syntheticLandmarks();

  it("produces a valid crop rect for each side and the eye band", () => {
    for (const region of ["left", "right", "eyes"] as const) {
      const rect = regionRect(region, landmarks);
      expect(rect, region).not.toBeNull();
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.y).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.w).toBeLessThanOrEqual(1);
      expect(rect!.y + rect!.h).toBeLessThanOrEqual(1);
      expect(rect!.w).toBeGreaterThan(0.03);
      expect(rect!.h).toBeGreaterThan(0.02);
    }
  });

  it("produces a compact marker ellipse per side, within bounds", () => {
    for (const side of SIDE_ORDER) {
      const e = regionEllipse(side, landmarks);
      expect(e, side).not.toBeNull();
      expect(e!.cx).toBeGreaterThanOrEqual(0);
      expect(e!.cx).toBeLessThanOrEqual(1);
      expect(e!.cy).toBeGreaterThanOrEqual(0);
      expect(e!.cy).toBeLessThanOrEqual(1);
      expect(e!.rx).toBeLessThanOrEqual(0.11);
      expect(e!.ry).toBeLessThanOrEqual(0.06);
    }
  });

  it("returns null when the mesh is missing", () => {
    expect(regionRect("left", [])).toBeNull();
    expect(regionEllipse("right", [])).toBeNull();
  });

  it("labels both sides", () => {
    expect(SIDE_ORDER).toEqual(["left", "right"]);
    expect(SIDE_LABEL.left).toBe("Left eye");
    expect(SIDE_LABEL.right).toBe("Right eye");
  });
});

describe("faceVisibleSide", () => {
  it("reports both for a front-facing mesh and a side for a turned one", () => {
    const front = syntheticLandmarks();
    front[1] = { x: 0.5, y: 0.5, z: 0 };
    front[234] = { x: 0.3, y: 0.5, z: 0 };
    front[454] = { x: 0.7, y: 0.5, z: 0 };
    expect(faceVisibleSide(front)).toBe("both");

    const turned = [...front];
    turned[234] = { x: 0.1, y: 0.5, z: 0 }; // lots of image-left cheek
    turned[454] = { x: 0.55, y: 0.5, z: 0 };
    expect(faceVisibleSide(turned)).toBe("left");
  });
});
