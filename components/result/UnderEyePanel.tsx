"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Eye, Sparkles } from "lucide-react";
import { useWizard } from "@/store/wizard-store";
import {
  regionEllipse,
  regionRect,
  faceVisibleSide,
  SIDE_LABEL,
  SIDE_ORDER,
  type NormEllipse,
} from "@/lib/face-regions";
import { cropImage, cropRect } from "@/lib/crop";
import { CONCERNS, CONCERN_ORDER } from "@/lib/constants";
import { CONCERN_TO_TREATMENT } from "@/lib/plan";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { EyeSide } from "@/lib/types";

interface SideCrop {
  side: EyeSide;
  src: string | null;
  marker: NormEllipse | null;
  covered: boolean;
}

/**
 * The under-eye panel. Shows the visitor a close-up band of their OWN eyes
 * (cropped on-device from the MediaPipe landmarks) with each under-eye area
 * highlighted, a thumbnail per side, and the five concern ratings Claude
 * returned. Renders nothing on the no-photo path.
 */
export function UnderEyePanel() {
  const imageBase64 = useWizard((s) => s.imageBase64);
  const imageMediaType = useWizard((s) => s.imageMediaType);
  const landmarks = useWizard((s) => s.landmarks);
  const result = useWizard((s) => s.result);

  const [band, setBand] = useState<{ src: string; rectW: number; rectH: number; rectX: number; rectY: number } | null>(null);
  const [sides, setSides] = useState<SideCrop[]>([]);

  const sidesObscured = useMemo(
    () => new Set(result?.sidesObscured ?? []),
    [result?.sidesObscured],
  );
  const leadTreatment = result?.treatment.lead;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!imageBase64 || !landmarks) {
        if (!cancelled) {
          setBand(null);
          setSides([]);
        }
        return;
      }
      const bandRect = regionRect("eyes", landmarks);
      // Exact crop (not the square thumbnail crop) so the side markers, which
      // are computed in band space, sit on the real under-eye pixels.
      const bandSrc = bandRect
        ? await cropRect(imageBase64, imageMediaType, bandRect)
        : null;

      const visible = faceVisibleSide(landmarks);
      const out: SideCrop[] = [];
      for (const side of SIDE_ORDER) {
        if (visible !== "both" && visible !== side) continue;
        const rect = regionRect(side, landmarks);
        const src = rect
          ? await cropImage(imageBase64, imageMediaType, rect)
          : null;
        out.push({
          side,
          src,
          marker: regionEllipse(side, landmarks),
          covered: sidesObscured.has(side),
        });
      }
      if (!cancelled) {
        setBand(
          bandSrc && bandRect
            ? {
                src: bandSrc,
                rectX: bandRect.x,
                rectY: bandRect.y,
                rectW: bandRect.w,
                rectH: bandRect.h,
              }
            : null,
        );
        setSides(out);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageBase64, imageMediaType, landmarks, sidesObscured]);

  if (!result || !result.usedPhoto || !band) return null;

  const severity = result.concernSeverity;
  const improvement = result.concernImprovement;
  // Concerns with a rating, most prominent first.
  const rated = CONCERN_ORDER.filter(
    (k) => typeof severity[k] === "number",
  ).sort((a, b) => (severity[b] ?? 0) - (severity[a] ?? 0));

  return (
    <div>
      <div className="flex items-center justify-center gap-2 text-center">
        <Eye size={15} className="text-peach" />
        <h3 className="font-serif text-xl text-heading sm:text-2xl">
          Your under-eye analysis
        </h3>
      </div>
      <p className="mx-auto mt-1 max-w-md text-center text-[13px] leading-relaxed text-body/80">
        Cropped from your own photo, on your device. The ratings below show
        what the AI could see under each eye — confirmed at your consultation.
      </p>

      {/* ── Eye band with markers ─────────────────────────────────────── */}
      <div className="mt-6 flex justify-center">
        <motion.figure
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative w-full max-w-[min(90vw,520px)] overflow-hidden rounded-[1.75rem] border border-peach/25 bg-cream-deep shadow-soft"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={band.src}
            alt="A close-up of your eyes with the under-eye areas highlighted"
            className="block h-auto w-full select-none"
            draggable={false}
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {sides.map((s) => {
              if (!s.marker) return null;
              // Re-express the full-image ellipse in the band crop's space.
              const cx = ((s.marker.cx - band.rectX) / band.rectW) * 100;
              const cy = ((s.marker.cy - band.rectY) / band.rectH) * 100;
              const rx = (s.marker.rx / band.rectW) * 100;
              const ry = (s.marker.ry / band.rectH) * 100;
              return (
                <motion.g
                  key={s.side}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  {!s.covered && (
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={rx}
                      ry={ry}
                      fill="rgba(212,175,55,0.14)"
                    />
                  )}
                  <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill="none"
                    stroke="#d4af37"
                    strokeWidth={1.2}
                    strokeDasharray={s.covered ? "3 2.5" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                </motion.g>
              );
            })}
          </svg>
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/70 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            Under-eye areas
          </span>
        </motion.figure>
      </div>

      {/* ── Side thumbnails ───────────────────────────────────────────── */}
      {sides.length > 0 && (
        <div className="mx-auto mt-4 grid max-w-[520px] gap-3 sm:grid-cols-2">
          {sides.map((s, i) => (
            <motion.div
              key={s.side}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: EASE }}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 shadow-soft"
            >
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-peach/20 bg-cream-deep">
                {s.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.src}
                    alt={`Close-up of your ${SIDE_LABEL[s.side].toLowerCase()}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-peach/60">
                    <Eye size={16} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-heading">
                  {SIDE_LABEL[s.side]}
                </p>
                <p className="text-[11px] leading-snug text-body/75">
                  {s.covered
                    ? "Covered in the photo — assessed at your consultation."
                    : "As it appears in your photo."}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Concern ratings ───────────────────────────────────────────── */}
      {rated.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {rated.map((k, i) => {
            const meta = CONCERNS[k];
            const sev = severity[k] ?? 0;
            const imp = improvement[k];
            const isLead =
              leadTreatment !== undefined &&
              leadTreatment !== "consultation" &&
              CONCERN_TO_TREATMENT[k] === leadTreatment &&
              i === 0;
            return (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.5, ease: EASE }}
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  isLead
                    ? "border-peach/50 bg-peach/[0.06]"
                    : "border-white/10 bg-white/[0.04]",
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-serif text-[15px] text-heading">
                    {meta.label}
                  </p>
                  {isLead && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-peach/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-peach-deep">
                      <Sparkles size={9} /> Main concern
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-body/75">
                  {meta.meaning}
                </p>
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em]">
                    <span className="text-body/70">Visibility</span>
                    <span className="text-peach-deep">{sev}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-cream-deep">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-peach-deep via-peach to-peach-light"
                      initial={{ width: 0 }}
                      animate={{ width: `${sev}%` }}
                      transition={{ duration: 0.9, ease: EASE, delay: 0.3 + i * 0.06 }}
                    />
                  </div>
                </div>
                {typeof imp === "number" && sev >= 15 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em]">
                      <span className="text-body/70">Improvement potential</span>
                      <span className="text-sage-deep">↑ {imp}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-cream-deep">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-sage-deep via-sage to-sage"
                        initial={{ width: 0 }}
                        animate={{ width: `${imp}%` }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.4 + i * 0.06 }}
                      />
                    </div>
                  </div>
                )}
                <p className="mt-2.5 text-[12px] leading-relaxed text-body">
                  {meta.blurb}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
