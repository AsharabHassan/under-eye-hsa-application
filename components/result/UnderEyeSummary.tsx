"use client";

import { motion } from "motion/react";
import { ScanEye } from "lucide-react";
import { CONCERNS } from "@/lib/constants";
import { CONCERN_TO_TREATMENT, rankConcerns } from "@/lib/plan";
import { CONDITIONS } from "@/lib/undereye-content";
import { EASE } from "@/lib/motion";
import type { AnalyzeResult, ConcernKey } from "@/lib/types";

/**
 * The concern the report is built around: the most visible concern that the
 * lead treatment treats (CO₂ bleph covers hooding, bags and crepey skin, so pick
 * whichever of those shows most), else simply the most visible concern.
 */
export function mainConcern(result: AnalyzeResult): ConcernKey {
  const ranked = rankConcerns(result.concernSeverity);
  const treated = ranked.find((c) => c.severity > 0 && CONCERN_TO_TREATMENT[c.key] === result.treatment.lead);
  return (treated ?? ranked[0]).key;
}

/**
 * Top of the report: WHAT under-eye condition this person has, what it is and
 * why it happens, and how visible each concern is in their photo — so
 * everything below reads as being about their under-eyes.
 */
export function UnderEyeSummary({ result }: { result: AnalyzeResult }) {
  const key = mainConcern(result);
  const c = CONDITIONS[key];
  const ranked = rankConcerns(result.concernSeverity).filter((r) => r.severity > 0);

  return (
    <div className="rounded-[2rem] border border-peach/30 bg-white/[0.04] p-6 shadow-soft sm:p-7">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-peach-deep">
        <ScanEye size={14} /> Your eye condition
      </p>
      <p className="mt-3 text-[13px] text-body/80">Your photo appears most consistent with</p>
      <h3 className="mt-1 font-serif text-[28px] leading-tight text-heading sm:text-[32px]">{c.name}</h3>
      <p className="mt-1 text-sm text-peach-deep">Often called {c.commonName}</p>

      <dl className="mt-5 space-y-4 text-[14px] leading-relaxed">
        <div>
          <dt className="font-semibold text-heading">What it is</dt>
          <dd className="mt-1 text-body">{c.what}</dd>
        </div>
        <div>
          <dt className="font-semibold text-heading">Why it happens</dt>
          <dd className="mt-1 text-body">{c.cause}</dd>
        </div>
      </dl>

      {ranked.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-body/70">
            What your photo shows
          </p>
          <div className="mt-3 grid gap-2.5">
            {ranked.map((r, i) => (
              <div key={r.key}>
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className={r.key === key ? "font-semibold text-heading" : "text-heading"}>
                    {CONCERNS[r.key].label}
                  </span>
                  <span className="text-peach-deep">{r.severity}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-peach-deep via-peach to-peach-light"
                    initial={{ width: 0 }}
                    animate={{ width: `${r.severity}%` }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.08 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-body/60">
            How visible each concern is in your photo — an indication, not a measurement. Your practitioner confirms the
            cause at your consultation.
          </p>
        </div>
      )}
    </div>
  );
}
