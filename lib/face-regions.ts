import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";
import type { EyeSide } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Maps the on-device MediaPipe 478-point face mesh to the under-eye areas the
// analysis rates, and turns each into a normalized crop rectangle and an
// overlay ellipse for the under-eye panel. Presentational only — it gives the
// user a focused look at their OWN under-eye areas; not a clinical measurement.
//
// Sides are named as they appear in the IMAGE: "left" = image-left,
// "right" = image-right — matching how Claude reports obscured sides.
// ─────────────────────────────────────────────────────────────────────────────

export type RegionKey = "left" | "right" | "eyes";

/** A crop rectangle in normalized (0–1) image coordinates. */
export interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A highlight ellipse in normalized (0–1) image coordinates. */
export interface NormEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

interface RegionConfig {
  /** Landmark indices whose bounding box approximates the region (for the CROP). */
  indices: number[];
  /** Tight landmark subset whose centre anchors the on-face MARKER. */
  anchorIndices?: number[];
  /** Fraction of the bbox size padded on every side for the CROP. */
  margin: number;
  /** Extra fraction of image height added BELOW the bbox (the tear trough runs onto the cheek). */
  extendDown?: number;
  /** Extra fraction of image height added ABOVE the bbox. */
  extendUp?: number;
}

// Crops cover the WHOLE eye area — brow to cheek — for eye rejuvenation.
// MediaPipe FaceMesh: landmarks 33…133 ring the IMAGE-LEFT eye (the subject's
// right eye in an unmirrored photo); 263…362 ring the IMAGE-RIGHT eye. The
// infra-orbital rows (117–121 / 346–350), the cheek-top points (100/101,
// 329/330) and the outer-canthus / temple points (127, 356) give the crop the
// tear trough and crow's-feet skin as well as the lower lid.
const REGIONS: Record<RegionKey, RegionConfig> = {
  left: {
    indices: [
      33, 7, 163, 144, 145, 153, 154, 155, 133, // lower lid ring
      117, 118, 119, 120, 121, 47, 100, 101, 111, 116, 123, // infra-orbital + trough
      127, 34, 143, // outer corner / crow's feet
      246, 161, 160, 159, 158, 157, 173, // upper lid
      70, 63, 105, 66, 107, // under the brow (hooding)
    ],
    anchorIndices: [117, 118, 119, 120, 121, 111, 116],
    margin: 0.18,
    extendDown: 0.03,
    extendUp: 0.01,
  },
  right: {
    indices: [
      263, 249, 390, 373, 374, 380, 381, 382, 362, // lower lid ring
      346, 347, 348, 349, 350, 277, 329, 330, 340, 345, 352, // infra-orbital + trough
      356, 264, 372, // outer corner / crow's feet
      466, 388, 387, 386, 385, 384, 398, // upper lid
      300, 293, 334, 296, 336, // under the brow (hooding)
    ],
    anchorIndices: [346, 347, 348, 349, 350, 340, 345],
    margin: 0.18,
    extendDown: 0.03,
    extendUp: 0.01,
  },
  eyes: {
    // Both eyes plus the under-eye band, for the panel's hero crop.
    indices: [
      33, 133, 159, 145, 263, 362, 386, 374, // eye rings (top/bottom points)
      117, 119, 121, 346, 348, 350, 100, 329, // under-eye rows
      127, 356, // temples
      6, 168, // nose bridge (keeps the band centred)
      70, 105, 107, 300, 334, 336, // brows — the upper lids and hooding are in frame
    ],
    margin: 0.14,
    extendDown: 0.045,
    extendUp: 0.01,
  },
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function rawBBox(indices: number[], landmarks: NormalizedPoint[]): BBox | null {
  const pts = indices.map((i) => landmarks[i]).filter(Boolean);
  if (pts.length < 3) return null;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/** Compute the normalized crop rect for a region, or null if unavailable. */
export function regionRect(
  region: RegionKey,
  landmarks: NormalizedPoint[],
): NormRect | null {
  const cfg = REGIONS[region];
  const bb = rawBBox(cfg.indices, landmarks);
  if (!bb) return null;
  let { minX, minY, maxX, maxY } = bb;

  const mw = (maxX - minX) * cfg.margin;
  const mh = (maxY - minY) * cfg.margin;
  minX -= mw;
  maxX += mw;
  minY -= mh;
  maxY += mh;
  if (cfg.extendDown) maxY += cfg.extendDown;
  if (cfg.extendUp) minY -= cfg.extendUp;

  minX = clamp01(minX);
  minY = clamp01(minY);
  maxX = clamp01(maxX);
  maxY = clamp01(maxY);

  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 0.03 || h < 0.02) return null; // too small to be meaningful
  return { x: minX, y: minY, w, h };
}

/**
 * Compute the on-face MARKER ellipse for an under-eye side — anchored on the
 * infra-orbital row and kept compact so it reads as a precise highlight on the
 * area rather than a face-swallowing blob.
 */
export function regionEllipse(
  region: EyeSide,
  landmarks: NormalizedPoint[],
): NormEllipse | null {
  const cfg = REGIONS[region];
  const bb = rawBBox(cfg.anchorIndices ?? cfg.indices, landmarks);
  if (!bb) return null;
  // Centre on the infra-orbital row, nudged slightly down onto the trough;
  // kept compact so the ring reads as the under-eye area, not the cheek.
  const cx = (bb.minX + bb.maxX) / 2;
  const cy = (bb.minY + bb.maxY) / 2 + (cfg.extendDown ?? 0) * 0.25;
  let rx = ((bb.maxX - bb.minX) / 2) * 1.15 + 0.01;
  let ry = ((bb.maxY - bb.minY) / 2) * 1.15 + 0.008 + (cfg.extendDown ?? 0) * 0.25;
  rx = Math.min(0.09, Math.max(0.04, rx));
  ry = Math.min(0.045, Math.max(0.024, ry));
  return { cx: clamp01(cx), cy: clamp01(cy), rx, ry };
}

/**
 * Estimate which side of the face is toward the camera, from how much cheek is
 * visible on each side of the nose. On a turned (3/4 or profile) photo the
 * far-side under-eye is foreshortened, so the panel shows only the visible
 * side; a roughly front-facing photo returns "both".
 */
export function faceVisibleSide(
  landmarks: NormalizedPoint[],
): "left" | "right" | "both" {
  const nose = landmarks[1];
  const leftEdge = landmarks[234]; // image-left cheek extreme
  const rightEdge = landmarks[454]; // image-right cheek extreme
  if (!nose || !leftEdge || !rightEdge) return "both";
  const leftGap = nose.x - leftEdge.x;
  const rightGap = rightEdge.x - nose.x;
  if (leftGap <= 0.01 || rightGap <= 0.01) {
    return leftGap > rightGap ? "left" : "right";
  }
  // Both under-eyes are readable on anything short of a clear 3/4 turn, so
  // the threshold is deliberately generous.
  const ratio = leftGap / rightGap;
  if (ratio > 2.2) return "left"; // image-left cheek more visible
  if (ratio < 1 / 2.2) return "right"; // image-right cheek more visible
  return "both";
}

/** The two under-eye sides in display order. */
export const SIDE_ORDER: EyeSide[] = ["left", "right"];

/** Short label for a side, as it appears in the photo. */
export const SIDE_LABEL: Record<EyeSide, string> = {
  left: "Left under-eye",
  right: "Right under-eye",
};
