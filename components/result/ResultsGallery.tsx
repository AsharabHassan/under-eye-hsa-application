"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { EASE } from "@/lib/motion";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";

// ─────────────────────────────────────────────────────────────────────────────
// Before/after gallery.
//
// EMPTY BY DESIGN: Harley Street Aesthetics has not yet supplied consented
// under-eye before/after pairs, so this section renders nothing. To enable it,
// drop the clinic's own consented pairs into /public/results (cropped to the
// eye area only, with documented patient consent) and add them to CASES.
// Never reuse imagery from any other clinic.
// ─────────────────────────────────────────────────────────────────────────────
const FRAME_RATIO = "4 / 3";

interface Case {
  area: string;
  before: string;
  after: string;
}

// TODO(HSA): add consented under-eye before/after pairs.
const CASES: Case[] = [];

/** True when there is at least one consented case to show. */
export const HAS_RESULTS_GALLERY = CASES.length > 0;

export function ResultsGallery() {
  const clinic = useClinicLocation();
  if (!HAS_RESULTS_GALLERY) return null;

  return (
    <div>
      <div className="flex items-center justify-center gap-2 text-center">
        <Sparkles size={14} className="text-peach" />
        <h3 className="font-serif text-xl text-heading">
          Real results, real patients
        </h3>
      </div>
      <p className="mx-auto mt-1 max-w-md text-center text-[13px] leading-relaxed text-body/80">
        Under-eye results from our {clinic.city} team. Individual results vary
        — yours is confirmed at your consultation.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {CASES.map((c, i) => (
          <motion.div
            key={c.area}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 * i, duration: 0.5, ease: EASE }}
          >
            <BeforeAfterSlider
              beforeSrc={c.before}
              afterSrc={c.after}
              area={c.area}
              ratio={FRAME_RATIO}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
