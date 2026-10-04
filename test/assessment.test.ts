import { describe, it, expect } from "vitest";
import {
  buildResult,
  genericFallbackResult,
  scoreInBucket,
  scoreForBucket,
} from "@/lib/assessment";
import { parseAssessment, type RawAssessment } from "@/lib/anthropic";
import type { PhotoAssessment } from "@/lib/types";

const assessment: PhotoAssessment = {
  suitability: "great",
  score: 91,
  sidesObscured: ["left"],
  makeupDetected: true,
  concernSeverity: { hollowing: 72, darkcircles: 41 },
  concernImprovement: { hollowing: 68, darkcircles: 44 },
  framingAdequate: true,
  proposedTreatment: "teartrough",
  treatmentReason: "The soft groove beneath your eyes suits tear trough filler.",
  narrative: {
    headline: "h",
    narrative: "n",
    observedAreas: ["hollowing"],
    encouragement: "e",
  },
};

describe("scoreInBucket", () => {
  it("clamps into the bucket band", () => {
    expect(scoreInBucket("great", 91)).toBe(91);
    expect(scoreInBucket("great", 20)).toBe(80);
    expect(scoreInBucket("great", 120)).toBe(99);
    expect(scoreInBucket("alternative", 90)).toBe(62);
  });

  it("falls back to the band midpoint for invalid scores", () => {
    expect(scoreInBucket("consultation", NaN)).toBe(
      scoreForBucket("consultation"),
    );
  });
});

describe("buildResult", () => {
  it("carries the under-eye fields through and runs the treatment guard", () => {
    const r = buildResult(assessment, true);
    expect(r.bucket).toBe("great");
    expect(r.score).toBe(91);
    expect(r.sidesObscured).toEqual(["left"]);
    expect(r.makeupDetected).toBe(true);
    expect(r.concernSeverity).toEqual({ hollowing: 72, darkcircles: 41 });
    expect(r.concernImprovement).toEqual({ hollowing: 68, darkcircles: 44 });
    expect(r.framingAdequate).toBe(true);
    expect(r.narrativeSource).toBe("claude");
    expect(r.usedPhoto).toBe(true);
    expect(r.treatment).toEqual({
      lead: "teartrough",
      secondary: "darkcircles",
      reason: "The soft groove beneath your eyes suits tear trough filler.",
      source: "claude",
    });
  });

  it("overrides a contradictory proposal", () => {
    const r = buildResult(
      { ...assessment, proposedTreatment: "antiwrinkle" },
      true,
    );
    expect(r.treatment.lead).toBe("teartrough");
    expect(r.treatment.source).toBe("guard");
  });
});

describe("genericFallbackResult", () => {
  it("routes safely to consultation with empty concern data", () => {
    const r = genericFallbackResult(true);
    expect(r.bucket).toBe("consultation");
    expect(r.narrativeSource).toBe("fallback");
    expect(r.sidesObscured).toEqual([]);
    expect(r.makeupDetected).toBe(false);
    expect(r.concernSeverity).toEqual({});
    expect(r.treatment.lead).toBe("consultation");
    // A failure isn't a framing problem — must not trigger a retake loop.
    expect(r.framingAdequate).toBe(true);
  });

  it("never names a medical condition or cause in fallback copy", () => {
    const r = genericFallbackResult(false);
    const text = [
      r.narrative.headline,
      r.narrative.narrative,
      r.narrative.encouragement,
    ]
      .join(" ")
      .toLowerCase();
    for (const term of [
      "hyperpigmentation",
      "allergic",
      "festoon",
      "ptosis",
      "thyroid",
      "anaemia",
      "oedema",
    ]) {
      expect(text).not.toContain(term);
    }
  });
});

describe("parseAssessment", () => {
  const raw: RawAssessment = {
    suitability: "strong",
    concernClarity: 34.4,
    skinReadiness: 26,
    improvementPotential: 24.2,
    sidesObscured: ["right", "right", "nonsense"],
    makeupDetected: false,
    concerns: [
      { concern: "hollowing", severityPercent: 71.6, improvementPercent: 66 },
      { concern: "darkcircles", severityPercent: 38, improvementPercent: 40 },
      { concern: "puffiness", severityPercent: 12, improvementPercent: 20 },
      { concern: "finelines", severityPercent: 140, improvementPercent: -3 },
      { concern: "bogus", severityPercent: 99, improvementPercent: 99 },
    ],
    leadTreatment: "teartrough",
    treatmentReason: "  The groove beneath your eyes… ",
    framingAdequate: true,
    headline: "h",
    narrative: "n",
    observedAreas: ["hollowing", 3 as unknown as string],
    encouragement: "e",
  };

  it("maps Claude's fields, sums the score and clamps concern figures", () => {
    const a = parseAssessment(raw);
    expect(a.suitability).toBe("great");
    expect(a.score).toBeCloseTo(84.6);
    expect(a.sidesObscured).toEqual(["right"]);
    expect(a.concernSeverity).toEqual({
      hollowing: 72,
      darkcircles: 38,
      puffiness: 12,
      finelines: 100,
    });
    expect(a.concernImprovement.finelines).toBe(0);
    expect(a.concernSeverity).not.toHaveProperty("bogus");
    expect(a.proposedTreatment).toBe("teartrough");
    expect(a.treatmentReason).toBe("The groove beneath your eyes…");
    expect(a.narrative.observedAreas).toEqual(["hollowing"]);
  });

  it("drops an unknown treatment proposal and rejects a malformed outcome", () => {
    expect(
      parseAssessment({ ...raw, leadTreatment: "surgery" }).proposedTreatment,
    ).toBeNull();
    expect(() =>
      parseAssessment({ ...raw, suitability: "excellent" }),
    ).toThrow("malformed assessment");
  });
});
