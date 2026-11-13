import "server-only";
import { skinScanUnderEye, underEyeNote } from "./skinscan";
import { reportAgreement } from "./skinscan-agreement";
import Anthropic from "@anthropic-ai/sdk";
import type {
  Bucket,
  ConcernKey,
  EyeSide,
  PhotoAssessment,
  TreatmentId,
} from "./types";
import { serverEnv } from "./env";
import { SYSTEM_UNDEREYE } from "./prompts/system-undereye";
import { RESULT_SCHEMA } from "./prompts/result-schema";
import { isTreatmentId } from "./plan";
import type { MediaType } from "@/store/wizard-store";

// ─────────────────────────────────────────────────────────────────────────────
// Server-only Claude Vision call. The system prompt is sent as a cached prefix;
// the photo goes in the user turn. Claude chooses the cosmetic suitability
// outcome, rates the five under-eye concerns, proposes a lead treatment and
// writes the narrative; lib/plan.ts validates the proposal. Face geometry stays
// on-device — Claude only returns concern-level figures keyed to a fixed enum.
// ─────────────────────────────────────────────────────────────────────────────

const VALID: Bucket[] = ["great", "good", "consultation", "alternative"];
const MAP: Record<string, Bucket> = {
  strong: "great",
  good: "good",
  consultation: "consultation",
  alternative: "alternative",
};

const CONCERN_KEYS: ConcernKey[] = [
  "hooding",
  "hollowing",
  "darkcircles",
  "puffiness",
  "finelines",
  "crowsfeet",
];

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: serverEnv().ANTHROPIC_API_KEY });
  return client;
}

export interface RawAssessment {
  suitability: string;
  concernClarity: number;
  skinReadiness: number;
  improvementPotential: number;
  sidesObscured: string[];
  makeupDetected: boolean;
  concerns: {
    concern: string;
    severityPercent: number;
    improvementPercent: number;
  }[];
  leadTreatment: string;
  treatmentReason: string;
  framingAdequate: boolean;
  headline: string;
  narrative: string;
  observedAreas: string[];
  encouragement: string;
}

/** Map Claude's raw JSON onto a PhotoAssessment. Pure; exported for tests. */
export function parseAssessment(raw: RawAssessment): PhotoAssessment {
  const bucket = MAP[raw.suitability];
  if (
    !bucket ||
    !VALID.includes(bucket) ||
    typeof raw.headline !== "string" ||
    typeof raw.narrative !== "string" ||
    !Array.isArray(raw.observedAreas) ||
    typeof raw.encouragement !== "string"
  ) {
    throw new Error("malformed assessment");
  }

  // The score is the sum of Claude's three observed factors (0–100). Summing
  // independently-judged parts gives a genuine, face-specific number that varies
  // photo-to-photo. Missing/invalid factors → NaN, and buildResult falls back
  // to the bucket midpoint.
  const factors = [
    raw.concernClarity,
    raw.skinReadiness,
    raw.improvementPotential,
  ];
  const score = factors.every((n) => typeof n === "number" && Number.isFinite(n))
    ? factors.reduce((a, b) => a + b, 0)
    : NaN;

  const concernSeverity: Partial<Record<ConcernKey, number>> = {};
  const concernImprovement: Partial<Record<ConcernKey, number>> = {};
  if (Array.isArray(raw.concerns)) {
    for (const item of raw.concerns) {
      const key = String(item?.concern ?? "") as ConcernKey;
      if (!CONCERN_KEYS.includes(key)) continue;
      const sev = Number(item?.severityPercent);
      const imp = Number(item?.improvementPercent);
      if (Number.isFinite(sev)) {
        const v = Math.max(0, Math.min(100, Math.round(sev)));
        const prev = concernSeverity[key];
        if (prev === undefined || v > prev) concernSeverity[key] = v;
      }
      if (Number.isFinite(imp)) {
        const v = Math.max(0, Math.min(100, Math.round(imp)));
        const prev = concernImprovement[key];
        if (prev === undefined || v > prev) concernImprovement[key] = v;
      }
    }
  }

  const sidesObscured: EyeSide[] = Array.isArray(raw.sidesObscured)
    ? raw.sidesObscured.filter(
        (s): s is EyeSide => s === "left" || s === "right",
      )
    : [];

  const proposedTreatment: TreatmentId | null = isTreatmentId(
    raw.leadTreatment,
  )
    ? raw.leadTreatment
    : null;

  return {
    suitability: bucket,
    score,
    sidesObscured: Array.from(new Set(sidesObscured)),
    makeupDetected: raw.makeupDetected === true,
    concernSeverity,
    concernImprovement,
    framingAdequate: raw.framingAdequate !== false,
    proposedTreatment,
    treatmentReason:
      typeof raw.treatmentReason === "string" ? raw.treatmentReason.trim() : "",
    narrative: {
      headline: raw.headline,
      narrative: raw.narrative,
      observedAreas: raw.observedAreas.filter((a) => typeof a === "string"),
      encouragement: raw.encouragement,
    },
  };
}

export async function assessPhoto(params: {
  imageBase64: string;
  imageMediaType: MediaType;
}): Promise<PhotoAssessment> {
  const env = serverEnv();

  const scan = await skinScanUnderEye(params.imageBase64);

  const message = await getClient().messages.create({
    model: env.ANTHROPIC_MODEL,
    // Thinking counts toward max_tokens, so leave room beyond the JSON. Claude
    // Sonnet 5.5 rejects thinking {type:"disabled"}; it runs adaptive thinking by
    // default and effort controls how much.
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: SYSTEM_UNDEREYE,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: RESULT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.imageMediaType,
              data: params.imageBase64,
            },
          },
          {
            type: "text",
            text: "Assess the eye area — upper eyelids, under-eyes and outer corners — in this selfie and produce the personalised result as the structured fields.",
          },
          ...(scan ? [{ type: "text" as const, text: underEyeNote(scan) }] : []),
        ],
      },
    ],
  });

  if (message.stop_reason === "refusal") {
    throw new Error(`refusal: ${message.stop_details?.category ?? "unspecified"}`);
  }
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("no text block");
  const result = parseAssessment(JSON.parse(block.text) as RawAssessment);

  // SkinScan agreement log (no effect on the result): only for readable photos.
  // Logging thresholds: SkinScan darkness index >= 10 is its own "moderate" cut;
  // Claude severity >= 40 counts as a visible concern. Raw values are stored too.
  if (scan && result.framingAdequate) {
    const dark = result.concernSeverity.darkcircles;
    const hollow = result.concernSeverity.hollowing;
    const agree: Record<string, boolean> = {};
    if (typeof dark === "number") agree.agree_darkcircles = (scan.darkness_index >= 10) === (dark >= 40);
    if (typeof hollow === "number") agree.agree_hollowing = (scan.character === "structural") === (hollow >= 40);
    if (Object.keys(agree).length)
      reportAgreement(
        "undereye",
        { darkness_index: scan.darkness_index, character: scan.character, version: scan.version },
        { darkcircles: dark ?? null, hollowing: hollow ?? null, proposedTreatment: result.proposedTreatment },
        agree,
      );
  }
  return result;
}
