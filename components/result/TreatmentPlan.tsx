"use client";

import { motion } from "motion/react";
import { CalendarHeart, Check, Phone, Sparkles, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/store/wizard-store";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";
import { scrollToBooking } from "@/components/result/BookingCalendar";
import { treatmentsFor } from "@/lib/plan";
import {
  TREATMENT_NOTE,
  hasPublishedPrice,
  type Treatment,
} from "@/lib/constants";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * "Your recommended treatment" — the HSA menu item the analysis matched
 * to this face (validated by lib/plan.ts), with the location's price when one
 * is published (otherwise "confirmed at your consultation"), plus a smaller "also worth discussing" card when a second concern is
 * present. Every CTA scrolls to the embedded consultation calendar.
 */
export function TreatmentPlan() {
  const result = useWizard((s) => s.result);
  if (!result) return null;

  const { lead, secondary } = treatmentsFor(result.treatment);
  const isConsultation = lead.id === "consultation";

  return (
    <section aria-labelledby="plan-heading">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-peach/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-peach-deep">
          <Sparkles size={12} /> Matched to your photo
        </span>
        <h3
          id="plan-heading"
          className="mt-3 font-serif text-2xl text-heading sm:text-[28px]"
        >
          {isConsultation
            ? "Your next step"
            : "Your treatment plan"}
        </h3>
        {result.treatment.reason ? (
          <p className="mx-auto mt-2 max-w-md font-serif text-[16px] italic leading-relaxed text-heading/85">
            {result.treatment.reason}
          </p>
        ) : (
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-body/80">
            Chosen from Harley Street Aesthetics&rsquo; own under-eye
            treatments. Our medical team confirms the plan at your
            consultation.
          </p>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <TreatmentCard treatment={lead} lead index={0} />
        {secondary && (
          <TreatmentCard treatment={secondary} lead={false} index={1} />
        )}
      </div>

      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-body/65">
        {TREATMENT_NOTE}
      </p>
    </section>
  );
}

function TreatmentCard({
  treatment,
  lead,
  index,
}: {
  treatment: Treatment;
  lead: boolean;
  index: number;
}) {
  const clinic = useClinicLocation();
  const isConsultation = treatment.id === "consultation";
  const published = hasPublishedPrice(treatment, clinic.key);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 * index, duration: 0.55, ease: EASE }}
      aria-label={`${treatment.name}${lead ? " (recommended for you)" : ""}`}
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border p-6 sm:p-7",
        lead
          ? "border-peach/60 bg-gradient-to-br from-peach/[0.08] via-white/[0.03] to-cream-deep/60 shadow-glow"
          : "border-white/10 bg-white/[0.04] shadow-soft",
      )}
    >
      <span
        className={cn(
          "mb-3 inline-flex rounded-full px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] sm:absolute sm:right-0 sm:top-0 sm:mb-0 sm:rounded-none sm:rounded-bl-2xl sm:px-4 sm:py-1.5",
          lead ? "bg-peach text-ink" : "bg-sage/15 text-heading/70",
        )}
      >
        {lead ? "Recommended for you" : "Also worth discussing"}
      </span>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:pr-4">
          <h4 className="font-serif text-[22px] leading-tight text-heading">
            {treatment.name}
          </h4>
          <p className="mt-1 text-[13px] font-medium text-peach-deep">
            {treatment.tagline}
          </p>
        </div>
        <div className="shrink-0 sm:max-w-[13rem] sm:text-right">
          <p
            className={cn(
              "font-serif leading-none",
              published ? "text-[30px]" : "text-[18px] leading-snug",
              lead ? "text-peach" : "text-heading",
            )}
          >
            {treatment.price[clinic.key]}
          </p>
          {published && (
            <p className="mt-1 text-[11px] text-body/70">
              {clinic.city} price
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-[13.5px] leading-relaxed text-body">
        {treatment.description}
      </p>

      <ul className="mt-4 space-y-2">
        <li className="flex items-start gap-2.5 text-[13.5px] text-heading">
          <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-peach/15 text-peach-deep">
            {isConsultation ? (
              <Stethoscope size={10} strokeWidth={3} />
            ) : (
              <Check size={11} strokeWidth={3} />
            )}
          </span>
          <span>{treatment.course}</span>
        </li>
        <li className="flex items-start gap-2.5 text-[13.5px] text-heading">
          <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-peach/15 text-peach-deep">
            <Check size={11} strokeWidth={3} />
          </span>
          <span>Delivered by our doctor-led team in {clinic.city}</span>
        </li>
      </ul>

      <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          size="md"
          variant={lead ? "primary" : "outline"}
          className="w-full sm:w-auto"
          onClick={scrollToBooking}
        >
          <CalendarHeart size={16} />
          {lead ? "Book your free consultation" : "Ask about this treatment"}
        </Button>
        <a
          href={clinic.phoneHref}
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-sage-deep transition hover:text-heading"
        >
          <Phone size={13} /> {clinic.phone}
        </a>
      </div>
    </motion.article>
  );
}
