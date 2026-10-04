"use client";

import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Illustrative "how to take your photo" guide for an under-eye read. Pure
// inline SVG line-art (no images to license, no privacy concerns). Eyes open,
// looking straight at the camera, even light, no glasses and no concealer give
// the AI the best read of contour, tone and texture.
// ─────────────────────────────────────────────────────────────────────────────

interface Tip {
  ok: boolean;
  label: string;
  art: ReactNode;
}

const svg = "h-full w-full";
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function EyesOpen() {
  return (
    <svg viewBox="0 0 64 64" className={svg} aria-hidden>
      <ellipse cx="32" cy="31" rx="15" ry="18" {...stroke} />
      <path d="M22 29 q4 -4 8 0 q-4 4 -8 0z" {...stroke} />
      <path d="M34 29 q4 -4 8 0 q-4 4 -8 0z" {...stroke} />
      <circle cx="26" cy="29" r="1.4" fill="currentColor" />
      <circle cx="38" cy="29" r="1.4" fill="currentColor" />
      <path d="M27 40 q5 3 10 0" {...stroke} />
    </svg>
  );
}

function GoodLight() {
  return (
    <svg viewBox="0 0 64 64" className={svg} aria-hidden>
      <ellipse cx="29" cy="33" rx="13" ry="16" {...stroke} />
      <circle cx="24" cy="31" r="1.5" fill="currentColor" />
      <circle cx="34" cy="31" r="1.5" fill="currentColor" />
      <path d="M25 40 q4 3 9 0" {...stroke} />
      <g {...stroke}>
        <circle cx="48" cy="16" r="5" />
        <path d="M48 6v3M48 23v3M58 16h-3M41 16h-3M55 9l-2 2M43 21l-2 2M55 23l-2-2M43 11l-2-2" />
      </g>
    </svg>
  );
}

function NoConcealer() {
  return (
    <svg viewBox="0 0 64 64" className={svg} aria-hidden>
      <ellipse cx="32" cy="31" rx="15" ry="18" {...stroke} />
      <circle cx="26" cy="29" r="1.6" fill="currentColor" />
      <circle cx="38" cy="29" r="1.6" fill="currentColor" />
      {/* soft under-eye shading — bare skin lets the AI see it */}
      <path d="M21 33 q5 4 10 0" {...stroke} strokeWidth={1.4} opacity={0.6} />
      <path d="M33 33 q5 4 10 0" {...stroke} strokeWidth={1.4} opacity={0.6} />
      <path d="M27 40 q5 4 10 0" {...stroke} />
    </svg>
  );
}

function NoGlasses() {
  return (
    <svg viewBox="0 0 64 64" className={svg} aria-hidden>
      <ellipse cx="32" cy="31" rx="15" ry="18" {...stroke} />
      <g {...stroke} strokeWidth={2.4}>
        <rect x="18" y="25" width="11" height="8" rx="3" />
        <rect x="35" y="25" width="11" height="8" rx="3" />
        <path d="M29 29h6" />
      </g>
      <path d="M27 40 q5 3 10 0" {...stroke} />
    </svg>
  );
}

function TooDark() {
  return (
    <svg viewBox="0 0 64 64" className={svg} aria-hidden>
      <ellipse cx="32" cy="31" rx="15" ry="18" {...stroke} />
      <circle cx="26" cy="28" r="1.5" fill="currentColor" />
      {/* one side of the face in shadow → uneven / too-dark lighting */}
      <path d="M32 13a15 18 0 0 1 0 36z" fill="currentColor" opacity={0.8} />
    </svg>
  );
}

function EyesClosed() {
  return (
    <svg viewBox="0 0 64 64" className={svg} aria-hidden>
      <ellipse cx="32" cy="31" rx="15" ry="18" {...stroke} />
      <path d="M22 30 q4 3 8 0" {...stroke} />
      <path d="M34 30 q4 3 8 0" {...stroke} />
      <path d="M27 40 q5 3 10 0" {...stroke} />
    </svg>
  );
}

const TIPS: Tip[] = [
  { ok: true, label: "Eyes open, face the camera", art: <EyesOpen /> },
  { ok: true, label: "Good, even light", art: <GoodLight /> },
  { ok: true, label: "No concealer", art: <NoConcealer /> },
  { ok: false, label: "No glasses", art: <NoGlasses /> },
  { ok: false, label: "Not too dark", art: <TooDark /> },
  { ok: false, label: "No squinting", art: <EyesClosed /> },
];

export function PhotoGuide() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-body/70">
        For the most accurate read
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {TIPS.map((t) => (
          <div
            key={t.label}
            className="flex flex-col items-center rounded-2xl bg-white/[0.03] px-1.5 py-2.5 text-center"
          >
            <div className="relative">
              <div
                className={`flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14 ${
                  t.ok ? "text-heading" : "text-heading/60"
                }`}
              >
                {t.art}
              </div>
              <span
                className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-white ${
                  t.ok ? "bg-sage-deep" : "bg-peach-deep"
                }`}
              >
                {t.ok ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
              </span>
            </div>
            <span className="mt-1.5 text-[10px] font-medium leading-tight text-heading/80 sm:text-[11px]">
              {t.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
