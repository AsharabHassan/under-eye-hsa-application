"use client";

import { motion } from "motion/react";
import { Award, Check, X, ShieldCheck } from "lucide-react";
import { TREATMENTS, hasPublishedPrice } from "@/lib/constants";
import { PITCH, WHY_HSA } from "@/lib/undereye-content";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";
import { EASE } from "@/lib/motion";
import type { TreatmentId } from "@/lib/types";

/**
 * The selling moment: names the HSA treatment our doctors recommend for THIS
 * person's under-eye condition, and shows why it goes further than the usual
 * alternatives. Rendered only for a real (non-consultation) lead treatment.
 */
export function RecommendedTreatment({ lead }: { lead: TreatmentId }) {
  const clinic = useClinicLocation();
  const pitch = PITCH[lead];
  const t = TREATMENTS[lead];
  if (!pitch || !t) return null;
  const priced = hasPublishedPrice(t, clinic.key);

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-peach/40 bg-gradient-to-b from-peach/[0.10] via-peach/[0.04] to-transparent p-6 shadow-soft sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-peach-deep">
        <Award size={14} /> Your recommended treatment
      </p>
      <h3 className="mt-3 font-serif text-[28px] leading-tight text-heading sm:text-[34px]">{t.name}</h3>
      <p className="mt-1.5 text-sm font-medium text-peach-deep">{pitch.subtitle}</p>
      <p className="mt-4 text-[15px] leading-relaxed text-body">{pitch.lead}</p>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-heading">
        Why it goes further than the alternatives
      </p>
      <div className="mt-3 grid gap-3">
        {pitch.comparisons.map((c, i) => (
          <motion.div
            key={c.alternative}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: 0.08 * i, duration: 0.5, ease: EASE }}
            className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-2 sm:gap-4"
          >
            <p className="flex items-start gap-2 text-[13.5px] leading-relaxed text-body/80">
              <X size={15} className="mt-0.5 shrink-0 text-body/50" />
              <span>
                <span className="font-semibold text-body">{c.alternative}</span> {c.limitation}
              </span>
            </p>
            <p className="flex items-start gap-2 text-[13.5px] leading-relaxed text-heading">
              <Check size={15} className="mt-0.5 shrink-0 text-peach-deep" />
              <span>{c.ours}</span>
            </p>
          </motion.div>
        ))}
      </div>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {WHY_HSA.map((w) => (
          <li key={w} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-body">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-sage-deep" />
            {w}
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-white/10 pt-5 text-sm text-body">
        <span className="font-semibold text-heading">{priced ? t.price[clinic.key] : "Price confirmed at your free consultation"}</span>
        {" · "}
        {t.course}
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-body/60">
        Your doctor confirms your suitability and plan at your consultation. Individual results vary.
      </p>
    </div>
  );
}
