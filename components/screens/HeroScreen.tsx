"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { JOURNEY } from "@/lib/consultation-journey";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/store/wizard-store";
import { EASE } from "@/lib/motion";
import { useLightFx } from "@/lib/use-light-fx";
import {
  useClinicFromRoute,
  useClinicLocation,
} from "@/components/clinic/ClinicLocationContext";
import { TrustMarkers } from "@/components/brand/TrustMarkers";

export function HeroScreen() {
  const start = useWizard((s) => s.start);
  const clinic = useClinicLocation();
  // The shared home page serves both cities; /london and /glasgow name theirs.
  const city = useClinicFromRoute() ? clinic.city : null;
  const isLondon = clinic.key === "london";

  return (
    <section className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <AuroraOrb />

      <motion.span
        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
        className="relative z-10 inline-flex max-w-full items-center gap-2 rounded-full border border-peach/35 bg-cream/80 px-4 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-peach-deep sm:text-[11px] sm:tracking-[0.22em] shadow-[0_8px_30px_-12px_rgba(212,175,55,0.45)] backdrop-blur-md"
      >
        <Sparkles size={13} className="shrink-0" /> Step 1 of your free eye consultation<span className="hidden sm:inline"> · {city ?? "London & Glasgow"}</span>
      </motion.span>

      <h1 className="relative z-10 mt-8 font-serif text-[44px] leading-[1.04] tracking-tight text-heading sm:text-[66px]">
        <Line delay={0.35}>
          {!city || isLondon ? "Tired eyes?" : "Tired-looking eyes?"}
        </Line>
        <Line delay={0.5}>
          <span className="text-gold-gradient">
            {city ? `Find your fix in ${city}` : "Find your fix in London or Glasgow"}
          </span>
        </Line>
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.85 }}
        className="relative z-10 mt-7 max-w-md text-lg leading-relaxed text-body"
      >
        Take a selfie and our AI reads your whole eye area — upper-lid
        hooding, hollowing, dark circles, puffiness, fine lines and
        crow&rsquo;s feet — then
        matches you to the right Harley Street Aesthetics treatment at our{" "}
        {city ? `${city} clinic` : "London or Glasgow clinic"}. Doctor-led. No pressure, just clarity.
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.92 }}
        className="relative z-10 mt-4 max-w-md text-[15px] font-medium leading-relaxed text-heading"
      >
        Your scan becomes a pre-consultation report. Our team
        then calls you to go through it and book your free 15-minute online
        consultation, where our doctor-led team confirms your plan and price.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 1.0 }}
        className="relative z-10 mt-10 flex flex-col items-center gap-5"
      >
        <Button size="lg" onClick={start} className="px-10">
          Start my pre-consultation scan
          <ArrowRight size={18} />
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] font-medium text-heading/55">
          <span>60 seconds</span>
          <Dot />
          <span>Includes a call from our team</span>
          <Dot />
          <span>No obligation</span>
        </div>
        <JourneyRow />
        <TrustMarkers className="max-w-lg" />
        <p className="flex max-w-sm items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-body/65">
          <MapPin size={13} className="mt-0.5 shrink-0 text-peach" />
          {city ? clinic.lines.join(" · ") : "Clinics in London (Belgravia) & Glasgow (Ingram House)"}
        </p>
      </motion.div>
    </section>
  );
}

/** Compact 4-step journey: the scan is only step 1, the consultation follows. */
function JourneyRow() {
  return (
    <ol
      aria-label="Your consultation journey"
      className="grid w-full max-w-lg grid-cols-2 gap-2 text-left sm:max-w-2xl sm:grid-cols-4"
    >
      {JOURNEY.map((stage, i) => {
        const consultation = stage.key === "consultation";
        return (
          <li
            key={stage.key}
            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${
              consultation
                ? "border-peach/50 bg-peach/[0.08]"
                : "border-peach/20 bg-white/[0.04]"
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-peach/40 text-[10px] font-semibold text-peach-deep">
              {i + 1}
            </span>
            <span className="text-[12px] font-semibold leading-tight text-heading">
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Line({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.0, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-peach-deep/50" />;
}

/** "AI analysis" centrepiece behind the headline: concentric rings, a slowly
 *  rotating conic scan-arc, and a soft pulsing blue glow. */
function AuroraOrb() {
  const reduce = useLightFx();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2"
    >
      <motion.div
        className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.22),transparent_65%)] blur-2xl"
        animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      {[0, 0.12, 0.24, 0.36].map((inset, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-peach/15"
          style={{ inset: `${inset * 100}%` }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.3 + i * 0.12 }}
        />
      ))}
      {!reduce && (
        <motion.div
          className="absolute inset-[6%] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.45) 40deg, transparent 120deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}
