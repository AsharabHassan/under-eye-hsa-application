"use client";

import type { AnalyzeResult, ClinicLocationKey, Lead } from "./types";
import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";
import {
  regionEllipse,
  regionRect,
  faceVisibleSide,
  SIDE_LABEL,
  SIDE_ORDER,
} from "./face-regions";
import { cropImage } from "./crop";
import {
  BUCKET_META,
  CLINIC,
  CONCERNS,
  CONCERN_ORDER,
  DISCLAIMER,
  TREATMENT_NOTE,
  getClinicLocation,
  hasPublishedPrice,
} from "./constants";
import { CONCERN_TO_TREATMENT, treatmentsFor } from "./plan";
import {
  buildReportPdf,
  type ReportConcern,
  type ReportSide,
  type ReportTreatment,
} from "./report-pdf";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

/** Render the eye band with each under-eye area ringed, mirroring the on-screen panel. */
async function renderAnnotatedEyes(
  imageBase64: string,
  mediaType: string,
  landmarks: NormalizedPoint[],
  result: AnalyzeResult,
): Promise<{ url: string; aspect: number } | null> {
  try {
    const band = regionRect("eyes", landmarks);
    if (!band) return null;
    const img = await loadImage(`data:${mediaType};base64,${imageBase64}`);
    const sx = band.x * img.naturalWidth;
    const sy = band.y * img.naturalHeight;
    const sw = band.w * img.naturalWidth;
    const sh = band.h * img.naturalHeight;
    const W = 760;
    const H = Math.max(1, Math.round((W * sh) / sw));
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);

    const visible = faceVisibleSide(landmarks);
    for (const side of SIDE_ORDER) {
      if (visible !== "both" && visible !== side) continue;
      const e = regionEllipse(side, landmarks);
      if (!e) continue;
      const cx = ((e.cx - band.x) / band.w) * W;
      const cy = ((e.cy - band.y) / band.h) * H;
      const rx = (e.rx / band.w) * W;
      const ry = (e.ry / band.h) * H;
      const covered = result.sidesObscured.includes(side);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (!covered) {
        ctx.fillStyle = "rgba(212,175,55,0.14)";
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(212,175,55,0.95)";
      ctx.lineWidth = 3;
      ctx.setLineDash(covered ? [8, 6] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    return { url: canvas.toDataURL("image/jpeg", 0.9), aspect: W / H };
  } catch {
    return null;
  }
}

/**
 * Build the branded under-eye report PDF entirely in the browser (renders the
 * annotated eye band + side crops, then lays them out via buildReportPdf).
 * Returns a PDF Blob. Works with or without a photo.
 */
export async function generateReportPdf(opts: {
  result: AnalyzeResult;
  imageBase64: string | null;
  imageMediaType: string;
  landmarks: NormalizedPoint[] | null;
  lead: Lead | null;
  clinicLocation: ClinicLocationKey;
}): Promise<Blob> {
  const { result, imageBase64, imageMediaType, landmarks, lead, clinicLocation } =
    opts;
  const meta = BUCKET_META[result.bucket];
  const clinic = getClinicLocation(clinicLocation);

  let eyesImageDataUrl: string | null = null;
  let eyesImageAspect: number | undefined;
  let sides: ReportSide[] = [];

  if (result.usedPhoto && imageBase64 && landmarks) {
    const eyes = await renderAnnotatedEyes(
      imageBase64,
      imageMediaType,
      landmarks,
      result,
    );
    eyesImageDataUrl = eyes?.url ?? null;
    eyesImageAspect = eyes?.aspect;
    const visible = faceVisibleSide(landmarks);
    sides = await Promise.all(
      SIDE_ORDER.filter((s) => visible === "both" || visible === s).map(
        async (side) => {
          const rect = regionRect(side, landmarks);
          const cropDataUrl = rect
            ? await cropImage(imageBase64, imageMediaType, rect)
            : null;
          return {
            title: SIDE_LABEL[side],
            cropDataUrl,
            covered: result.sidesObscured.includes(side),
          } satisfies ReportSide;
        },
      ),
    );
  }

  const leadId = result.treatment.lead;
  const concerns: ReportConcern[] = CONCERN_ORDER.filter(
    (k) => typeof result.concernSeverity[k] === "number",
  )
    .sort(
      (a, b) =>
        (result.concernSeverity[b] ?? 0) - (result.concernSeverity[a] ?? 0),
    )
    .map((k, i) => ({
      title: CONCERNS[k].label,
      blurb: CONCERNS[k].blurb,
      severity: result.concernSeverity[k] ?? 0,
      improvement: result.concernImprovement[k] ?? null,
      lead:
        i === 0 &&
        leadId !== "consultation" &&
        CONCERN_TO_TREATMENT[k] === leadId,
    }));

  const { lead: leadTreatment, secondary } = treatmentsFor(result.treatment);
  const toReportTreatment = (
    t: typeof leadTreatment,
  ): ReportTreatment => ({
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    course: t.course,
    price: t.price[clinic.key],
    pricePublished: hasPublishedPrice(t, clinic.key),
  });

  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return buildReportPdf({
    clinicName: CLINIC.name,
    treatmentName: "Under-Eye",
    byline: `${clinic.city} · ${CLINIC.director}`,
    mono: "H S A",
    // Harley Street Aesthetics dark-gold palette (matches app/globals.css).
    palette: {
      bg: [9, 9, 9],
      panel: [22, 19, 15],
      accent: [212, 175, 55],
      accentDeep: [231, 198, 104],
      heading: [245, 241, 230],
      body: [198, 191, 178],
      faint: [138, 132, 122],
      line: [62, 57, 48],
      badgeText: [9, 9, 9],
    },
    phone: clinic.phone,
    email: CLINIC.email,
    bookingUrl: clinic.bookingUrl.replace(/^https?:\/\//, ""),
    addressLines: [...clinic.lines],
    preparedFor: lead?.firstName?.trim() || undefined,
    dateStr,
    verdictLabel: meta.label,
    headline: result.narrative.headline,
    score: result.score,
    narrative: result.narrative.narrative,
    encouragement: result.narrative.encouragement,
    usedPhoto: result.usedPhoto,
    obscuredNotice: result.sidesObscured.length > 0,
    makeupNotice: result.makeupDetected,
    eyesImageDataUrl,
    eyesImageAspect,
    sides,
    concerns,
    treatment: toReportTreatment(leadTreatment),
    treatmentReason: result.treatment.reason,
    secondaryTreatment: secondary ? toReportTreatment(secondary) : null,
    priceNote: TREATMENT_NOTE,
    disclaimer: DISCLAIMER,
  });
}
