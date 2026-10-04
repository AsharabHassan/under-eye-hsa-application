import type {
  Bucket,
  ConcernKey,
  TreatmentId,
  TreatmentRecommendation,
} from "./types";
import { CONCERN_ORDER, TREATMENTS, type Treatment } from "./constants";

// ─────────────────────────────────────────────────────────────────────────────
// Treatment recommendation guard. Claude proposes a lead treatment from the
// photo; this module checks the proposal against the concern severities it
// also returned and overrides when they contradict. Pure — no network — and
// the single place the routing rules live, so the client can sign them off.
// ─────────────────────────────────────────────────────────────────────────────

const TREATMENT_IDS: TreatmentId[] = [
  "darkcircles",
  "teartrough",
  "coolbleph",
  "antiwrinkle",
  "consultation",
];

/** Severity at or above which a concern is considered "present enough" to lead. */
export const DOMINANT_THRESHOLD = 35;
/** A concern within this many points of the dominant one is a fair alternative. */
export const NEAR_TIE_MARGIN = 10;
/** Minimum severity for a secondary ("also worth discussing") treatment. */
export const SECONDARY_THRESHOLD = 30;

export function isTreatmentId(v: unknown): v is TreatmentId {
  return typeof v === "string" && (TREATMENT_IDS as string[]).includes(v);
}

/** The treatment each concern leads to. Puffiness and crepey skin go to CO₂ non-surgical blepharoplasty — never filler. */
export const CONCERN_TO_TREATMENT: Record<ConcernKey, TreatmentId> = {
  hooding: "coolbleph",
  hollowing: "teartrough",
  darkcircles: "darkcircles",
  puffiness: "coolbleph",
  finelines: "coolbleph",
  crowsfeet: "antiwrinkle",
};

/** Concerns sorted by severity, highest first (ties keep CONCERN_ORDER). */
export function rankConcerns(
  severity: Partial<Record<ConcernKey, number>>,
): { key: ConcernKey; severity: number }[] {
  return CONCERN_ORDER.map((key) => ({
    key,
    severity: clamp(severity[key]),
  })).sort((a, b) => b.severity - a.severity);
}

function clamp(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Decide the lead + secondary treatment for a result.
 *
 * Rules (owner-reviewable):
 * 1. A `consultation` or `alternative` outcome always leads to a consultation.
 * 2. The dominant concern is the highest severity ≥ 35. Puffiness dominant →
 *    CO₂ non-surgical blepharoplasty (filler does not treat puffiness;
 *    never route it to tear trough filler).
 * 3. Otherwise the dominant concern's treatment wins — unless Claude proposed
 *    the treatment for a concern within 10 points of the dominant one, in which
 *    case Claude's judgement stands (it saw the face; the numbers are close).
 * 4. With no concern ≥ 35 Claude's proposal stands if it is a real treatment;
 *    a missing or "consultation" proposal falls back to the Dark Circles
 *    Treatment, the gentlest skin-quality option for a mild presentation.
 * 5. Secondary = the treatment for the next concern ≥ 30 that maps to a
 *    different treatment than the lead and is not a consultation.
 */
export function decideTreatment(params: {
  bucket: Bucket;
  severity: Partial<Record<ConcernKey, number>>;
  proposed: TreatmentId | null;
  reason: string;
}): TreatmentRecommendation {
  const { bucket, severity, proposed } = params;
  const reason = params.reason?.trim() ?? "";
  const ranked = rankConcerns(severity);

  if (bucket === "consultation" || bucket === "alternative") {
    return {
      lead: "consultation",
      secondary: null,
      reason,
      source: proposed === "consultation" ? "claude" : "guard",
    };
  }

  const dominant = ranked[0].severity >= DOMINANT_THRESHOLD ? ranked[0] : null;
  let lead: TreatmentId;
  let source: TreatmentRecommendation["source"];

  if (!dominant) {
    if (proposed && proposed !== "consultation") {
      lead = proposed;
      source = "claude";
    } else {
      lead = "darkcircles";
      source = "guard";
    }
  } else {
    const ruled = CONCERN_TO_TREATMENT[dominant.key];
    if (ruled === "consultation") {
      lead = "consultation";
      source = proposed === "consultation" ? "claude" : "guard";
    } else if (proposed === ruled) {
      lead = ruled;
      source = "claude";
    } else if (
      proposed &&
      proposed !== "consultation" &&
      ranked.some(
        (c) =>
          c.severity >= dominant.severity - NEAR_TIE_MARGIN &&
          c.severity >= DOMINANT_THRESHOLD &&
          CONCERN_TO_TREATMENT[c.key] === proposed,
      )
    ) {
      lead = proposed;
      source = "claude";
    } else {
      lead = ruled;
      source = "guard";
    }
  }

  const secondary =
    lead === "consultation"
      ? null
      : (ranked
          .filter((c) => c.severity >= SECONDARY_THRESHOLD)
          .map((c) => CONCERN_TO_TREATMENT[c.key])
          .find((t) => t !== lead && t !== "consultation") ?? null);

  return { lead, secondary, reason, source };
}

/** Resolve the Treatment objects for a recommendation. */
export function treatmentsFor(rec: TreatmentRecommendation): {
  lead: Treatment;
  secondary: Treatment | null;
} {
  return {
    lead: TREATMENTS[rec.lead],
    secondary: rec.secondary ? TREATMENTS[rec.secondary] : null,
  };
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** "£400". Returns "" for 0 / unpublished prices so nothing ever reads "from £0". */
export function formatGbp(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return gbp.format(n);
}
