// JSON schema for Claude's structured photo assessment. Deliberately simple —
// structured outputs don't support min/max/length constraints, and every object
// needs additionalProperties:false.

const CONCERN_ENUM = [
  "hollowing",
  "darkcircles",
  "puffiness",
  "finelines",
  "crowsfeet",
] as const;

const TREATMENT_ENUM = [
  "darkcircles",
  "teartrough",
  "coolbleph",
  "morpheus8",
  "antiwrinkle",
  "consultation",
] as const;

export const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    suitability: {
      type: "string",
      enum: ["strong", "good", "consultation", "alternative"],
      description:
        "The cosmetic suitability outcome. 'strong' = a clearly visible, treatable under-eye concern (hollowing, darker tone, puffiness/bags, crepey skin/fine lines, crow's feet) — the ideal candidate; 'good' = a milder or subtler version that still responds well; 'consultation' = the photo can't be assessed (eyes closed, dark, blurry, sunglasses, heavy concealer), or the area needs an in-person look first; 'alternative' = the standout concern is out of scope for the five treatments.",
    },
    concernClarity: {
      type: "number",
      description:
        "0–40. How CLEARLY a treatable under-eye concern is visible — a distinct hollow, clearly darker tone, clear crepey texture or lines, or clear crow's feet. A clear, treatable concern scores HIGH. Score low only when the area already looks smooth and even, or the concern is out of scope. Judge ONLY from this photo, with fine gradations — avoid identical values across different faces.",
    },
    skinReadiness: {
      type: "number",
      description:
        "0–30. Apparent readiness of the under-eye skin for an injectable-based treatment (calm, intact skin scores higher; visible irritation, active spots or very heavy coverage lowers it). Judge only from this photo, with fine gradations.",
    },
    improvementPotential: {
      type: "number",
      description:
        "0–30. How much the treatment matched to the main concern could visibly change the area — a clear hollow, distinct dark tone or defined lines score high; an already refreshed area scores low. Judge only from this photo, with fine gradations.",
    },
    sidesObscured: {
      type: "array",
      description:
        "Under-eye sides that cannot be reliably read in THIS photo, named as they appear in the image ('left' = image-left, 'right' = image-right) — hidden by glasses, sunglasses, hair, a hand, harsh shadow or heavy concealer. Empty array when both are visible. An obscured side NEVER disqualifies treatment — it only limits what the photo shows.",
      items: { type: "string", enum: ["left", "right"] },
    },
    makeupDetected: {
      type: "boolean",
      description:
        "True when concealer, foundation, colour-corrector or a smoothing filter appears to be evening out the under-eye area, so the photo understates the real concern. Makeup does NOT disqualify treatment and does not require a retake. When coverage is clearly heavy, lean towards 'consultation'.",
    },
    concerns: {
      type: "array",
      description:
        "Exactly five items, one per concern: severityPercent = how prominent that concern is in THIS photo (0–100, fine gradations; near 0–15 when barely present); improvementPercent = an indicative cosmetic improvement after the matched treatment — clear concern 55–80, subtle 30–50, little needed 15–35 (for puffiness, the modest improvement a consultation-led plan could offer).",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          concern: { type: "string", enum: CONCERN_ENUM },
          severityPercent: { type: "number" },
          improvementPercent: { type: "number" },
        },
        required: ["concern", "severityPercent", "improvementPercent"],
      },
    },
    leadTreatment: {
      type: "string",
      enum: TREATMENT_ENUM,
      description:
        "The ONE Harley Street Aesthetics menu item that best addresses the most prominent concern: hollowing → 'teartrough'; dark circles / dull, thin skin → 'darkcircles'; puffiness / under-eye bags → 'coolbleph' (never filler); fine lines / crepey texture → 'morpheus8'; crow's feet → 'antiwrinkle'. MUST be 'consultation' when suitability is 'consultation' or 'alternative', or when the photo cannot be read.",
    },
    treatmentReason: {
      type: "string",
      description:
        "One sentence, written to the person, giving the cosmetic reason for the lead treatment (e.g. 'The soft groove beneath your eyes is the kind of hollowing tear trough filler is designed to restore.'). Cosmetic language only — no conditions, causes or measurements. UK English.",
    },
    framingAdequate: {
      type: "boolean",
      description:
        "True only if BOTH under-eye areas are clearly visible, eyes open, in focus, and evenly lit well enough to judge tone and contour. False if the eyes are closed or squinting, the head is turned so one eye is hidden, the face is too small/far, the photo is too dark or blurry, strong side-lighting shadows one side, an obvious colour filter or sunglasses are present, or it's a screenshot rather than a clean front-facing selfie at eye level. When false the person should retake their photo.",
    },
    headline: {
      type: "string",
      description: "A warm, 6–10 word headline for the result screen.",
    },
    narrative: {
      type: "string",
      description:
        "2–3 short sentences, personalized-but-careful, cosmetic not diagnostic. UK English.",
    },
    observedAreas: {
      type: "array",
      description:
        "1–3 short cosmetic phrases for the concerns you observed, e.g. 'hollowing', 'dark circles', 'fine lines', 'crow's feet', 'puffiness'.",
      items: { type: "string" },
    },
    encouragement: {
      type: "string",
      description:
        "One encouraging closing line that gently notes suitability is confirmed by our Harley Street medical team and points toward booking a consultation.",
    },
  },
  required: [
    "suitability",
    "concernClarity",
    "skinReadiness",
    "improvementPotential",
    "sidesObscured",
    "makeupDetected",
    "concerns",
    "leadTreatment",
    "treatmentReason",
    "framingAdequate",
    "headline",
    "narrative",
    "observedAreas",
    "encouragement",
  ],
} as const;
