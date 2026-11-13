// ─────────────────────────────────────────────────────────────────────────────
// Domain model for the HSA Eye Rejuvenation Analyzer. Claude Vision chooses the
// suitability outcome, rates five under-eye concerns and proposes a lead
// treatment from Harley Street Aesthetics' own menu; lib/plan.ts validates that proposal.
// All face geometry stays on-device (MediaPipe) — the model only ever returns
// concern-level figures, never coordinates.
// ─────────────────────────────────────────────────────────────────────────────

/** The four suitability outcomes. Never a flat "you don't qualify". */
export type Bucket = "great" | "good" | "consultation" | "alternative";

/** Landing clinic selected by the campaign route. */
export type ClinicLocationKey = "london" | "glasgow";

/** The under-eye concerns the analysis rates. */
export type ConcernKey =
  | "hooding"
  | "hollowing"
  | "darkcircles"
  | "puffiness"
  | "finelines"
  | "crowsfeet";

/** Treatments on the HSA menu the result can recommend. */
export type TreatmentId =
  | "darkcircles"
  | "teartrough"
  | "coolbleph"
  | "antiwrinkle"
  | "consultation";

/** Under-eye side as it appears in the photo (image-left / image-right). */
export type EyeSide = "left" | "right";

/** Machine-readable reason a hard flag fired (carried for GHL payload shape). */
export type HardFlag = string;

/** Deterministic routing fields kept for the GHL payload / result envelope. */
export interface ScoreResult {
  bucket: Bucket;
  /** 0–100 normalized suitability score (presentational). */
  score: number;
  hardFlags: HardFlag[];
  /** True when a soft flag forced a consultation routing. */
  softFlagged: boolean;
  /** Short, human-readable reason for the routing (used as a fallback narrative seed). */
  routedReason: string;
}

/** The narrative portion Claude authors. */
export interface ClaudeNarrative {
  headline: string;
  /** 2–3 short sentences, personalized-but-careful, cosmetic not diagnostic. */
  narrative: string;
  /** Concerns Claude observed/affirmed, phrased in general terms. */
  observedAreas: string[];
  encouragement: string;
}

/** The treatment recommendation attached to a result. */
export interface TreatmentRecommendation {
  /** The lead treatment the result presents. */
  lead: TreatmentId;
  /** A second treatment worth discussing, or null. */
  secondary: TreatmentId | null;
  /** Claude's one-sentence, cosmetic reason for the lead treatment. */
  reason: string;
  /** Whether the lead treatment is Claude's own pick or the guard's override. */
  source: "claude" | "guard";
}

/** The full result returned by /api/analyze and rendered on the result screen. */
export interface AnalyzeResult extends ScoreResult {
  narrative: ClaudeNarrative;
  /** Whether the narrative came from Claude or the deterministic fallback. */
  narrativeSource: "claude" | "fallback";
  /** True when a photo was analyzed. */
  usedPhoto: boolean;
  /** Under-eye sides that could not be read (glasses, hair, shadow, heavy concealer). */
  sidesObscured: EyeSide[];
  /** True when concealer/makeup or a filter appears to be evening out the area. */
  makeupDetected: boolean;
  /** Per-concern prominence (0–100), keyed by ConcernKey. */
  concernSeverity: Partial<Record<ConcernKey, number>>;
  /** Indicative per-concern improvement potential (0–100), keyed by ConcernKey. */
  concernImprovement: Partial<Record<ConcernKey, number>>;
  /** False when both under-eye areas aren't clearly visible and evenly lit — prompt a retake. */
  framingAdequate: boolean;
  /** The validated treatment recommendation. */
  treatment: TreatmentRecommendation;
}

/** Lead captured at the gate. */
export interface Lead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** Request body for POST /api/analyze. */
export interface AnalyzeRequest {
  imageBase64: string | null;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp";
  /** Explicit consent to process the face image. Required when imageBase64 present. */
  imageConsent: boolean;
}

/** Claude's raw assessment of the photo: a cosmetic suitability read + narrative. */
export interface PhotoAssessment {
  /** The suitability outcome Claude chose, mapped to a Bucket server-side. */
  suitability: Bucket;
  /** Claude's 0–100 suitability score for this face; clamped to the bucket band. */
  score: number;
  narrative: ClaudeNarrative;
  sidesObscured: EyeSide[];
  makeupDetected: boolean;
  concernSeverity: Partial<Record<ConcernKey, number>>;
  concernImprovement: Partial<Record<ConcernKey, number>>;
  framingAdequate: boolean;
  /** Claude's proposed lead treatment (validated by lib/plan.ts). */
  proposedTreatment: TreatmentId | null;
  /** Claude's one-sentence reason for the proposal. */
  treatmentReason: string;
}

/** Browser-readable attribution only. Conversion identity is server-owned. */
export interface ClientMetaAttribution {
  /** Meta browser id cookie (`_fbp`). */
  fbp: string | null;
  /** Meta click id cookie (`_fbc`), synthesized from `fbclid` when absent. */
  fbc: string | null;
  eventSourceUrl: string | null;
}

/** Server-owned, allow-listed Meta conversion fields. */
export interface ServerMetaConversion {
  datasetId: string;
  pixelId: string;
  eventName: "Lead";
  eventId: string;
  /** Unix seconds. */
  eventTime: number;
  actionSource: "website";
  eventSourceUrl: string;
  fbp?: string;
  fbc?: string;
  /** Raw Meta click identifier, derived server-side from a validated `_fbc`. */
  fbclid?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  clientUserAgent?: string;
  clientIpAddress?: string;
}

/** Request body for POST /api/lead. */
export interface LeadRequest {
  lead: Lead;
  result: AnalyzeResult;
  /** Clinic market selected by the landing route; defaults to London server-side. */
  clinicLocation: ClinicLocationKey;
  /** Explicit statement confirmed by the camera/upload action. */
  imageProcessingConsent: boolean;
  /** Client-recorded time of the affirmative camera/upload action. */
  imageProcessingConsentAt: string;
  /** Explicit choice for Meta advertising measurement. */
  metaTrackingConsent: boolean;
  /** The client ticked "I'm requesting a free consultation" before the scan. */
  consultationContactConsent?: true;
  consultationContactConsentAt?: string;
  /** The exact wording they agreed to, kept on the CRM contact as evidence. */
  consultationContactStatement?: string;
  consultationContactConsentVersion?: string;
  preferredCallTime?: "morning" | "afternoon" | "evening";
  /** Optional browser attribution; ignored unless Meta tracking is accepted. */
  attribution?: ClientMetaAttribution;
}
