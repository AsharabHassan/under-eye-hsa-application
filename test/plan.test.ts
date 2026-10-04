import { describe, it, expect } from "vitest";
import {
  decideTreatment,
  rankConcerns,
  treatmentsFor,
  CONCERN_TO_TREATMENT,
  DOMINANT_THRESHOLD,
} from "@/lib/plan";
import {
  PRICE_AT_CONSULTATION,
  TREATMENTS,
  hasPublishedPrice,
} from "@/lib/constants";

const sev = (o: Partial<Record<keyof typeof CONCERN_TO_TREATMENT, number>>) =>
  o;

describe("rankConcerns", () => {
  it("orders concerns by severity, treating missing as 0", () => {
    const ranked = rankConcerns(sev({ darkcircles: 70, hollowing: 20 }));
    expect(ranked[0]).toEqual({ key: "darkcircles", severity: 70 });
    expect(ranked[1]).toEqual({ key: "hollowing", severity: 20 });
    expect(ranked.at(-1)?.severity).toBe(0);
  });

  it("clamps and rounds out-of-range values", () => {
    const ranked = rankConcerns(sev({ crowsfeet: 140, finelines: -5, puffiness: NaN }));
    expect(ranked[0]).toEqual({ key: "crowsfeet", severity: 100 });
    expect(ranked.find((c) => c.key === "finelines")?.severity).toBe(0);
    expect(ranked.find((c) => c.key === "puffiness")?.severity).toBe(0);
  });
});

describe("decideTreatment — outcome rules", () => {
  it("routes consultation and alternative outcomes to a consultation", () => {
    for (const bucket of ["consultation", "alternative"] as const) {
      const r = decideTreatment({
        bucket,
        severity: sev({ hollowing: 90 }),
        proposed: "teartrough",
        reason: "x",
      });
      expect(r.lead).toBe("consultation");
      expect(r.secondary).toBeNull();
      expect(r.source).toBe("guard");
    }
  });

  it("keeps Claude's pick when it matches the dominant concern", () => {
    const r = decideTreatment({
      bucket: "great",
      severity: sev({ hollowing: 72, darkcircles: 40 }),
      proposed: "teartrough",
      reason: "The groove beneath your eyes…",
    });
    expect(r).toMatchObject({
      lead: "teartrough",
      secondary: "darkcircles",
      source: "claude",
      reason: "The groove beneath your eyes…",
    });
  });

  it("overrides Claude when its pick contradicts the dominant concern", () => {
    const r = decideTreatment({
      bucket: "great",
      severity: sev({ crowsfeet: 80, hollowing: 12 }),
      proposed: "teartrough",
      reason: "",
    });
    expect(r.lead).toBe("antiwrinkle");
    expect(r.source).toBe("guard");
  });

  it("lets Claude's judgement stand on a near tie", () => {
    const r = decideTreatment({
      bucket: "good",
      severity: sev({ hollowing: 60, darkcircles: 54 }),
      proposed: "darkcircles",
      reason: "",
    });
    expect(r.lead).toBe("darkcircles");
    expect(r.source).toBe("claude");
    expect(r.secondary).toBe("teartrough");
  });

  it("routes dominant puffiness to CO2 blepharoplasty, never filler", () => {
    const r = decideTreatment({
      bucket: "great",
      severity: sev({ puffiness: 75, hollowing: 60 }),
      proposed: "teartrough",
      reason: "",
    });
    expect(r.lead).toBe("coolbleph");
    expect(r.lead).not.toBe("teartrough");
    expect(r.source).toBe("guard");
    // Hollowing is a separate concern and can still be discussed second.
    expect(r.secondary).toBe("teartrough");
  });

  it("keeps Claude's CO2 blepharoplasty pick for dominant puffiness", () => {
    const r = decideTreatment({
      bucket: "good",
      severity: sev({ puffiness: 62 }),
      proposed: "coolbleph",
      reason: "",
    });
    expect(r).toMatchObject({ lead: "coolbleph", source: "claude" });
  });

  it("falls back to the Dark Circles Treatment for a mild presentation with no usable proposal", () => {
    const r = decideTreatment({
      bucket: "good",
      severity: sev({ hollowing: 20, darkcircles: 25 }),
      proposed: "consultation",
      reason: "",
    });
    expect(r.lead).toBe("darkcircles");
    expect(r.source).toBe("guard");
  });

  it("keeps a real proposal for a mild presentation", () => {
    const r = decideTreatment({
      bucket: "good",
      severity: sev({ finelines: 30 }),
      proposed: "coolbleph",
      reason: "",
    });
    expect(r.lead).toBe("coolbleph");
    expect(r.source).toBe("claude");
  });

  it("picks the next concern's treatment as the secondary", () => {
    const r = decideTreatment({
      bucket: "great",
      severity: sev({ darkcircles: 70, puffiness: 45, finelines: 40 }),
      proposed: "darkcircles",
      reason: "",
    });
    expect(r.lead).toBe("darkcircles");
    expect(r.secondary).toBe("coolbleph");
  });

  it("uses the documented dominant threshold", () => {
    const just = decideTreatment({
      bucket: "good",
      severity: sev({ crowsfeet: DOMINANT_THRESHOLD }),
      proposed: "teartrough",
      reason: "",
    });
    expect(just.lead).toBe("antiwrinkle");
    const under = decideTreatment({
      bucket: "good",
      severity: sev({ crowsfeet: DOMINANT_THRESHOLD - 1 }),
      proposed: "teartrough",
      reason: "",
    });
    expect(under.lead).toBe("teartrough");
  });
});

describe("treatmentsFor / menu integrity", () => {
  it("resolves both treatments from the HSA menu", () => {
    const t = treatmentsFor({
      lead: "teartrough",
      secondary: "antiwrinkle",
      reason: "",
      source: "claude",
    });
    expect(t.lead.name).toBe("Tear trough filler");
    expect(t.secondary?.name).toBe("Anti-wrinkle injections");
  });

  it("maps each concern to the agreed HSA treatment", () => {
    expect(CONCERN_TO_TREATMENT).toEqual({
      hooding: "coolbleph",
      hollowing: "teartrough",
      darkcircles: "darkcircles",
      puffiness: "coolbleph",
      finelines: "coolbleph",
      crowsfeet: "antiwrinkle",
    });
    expect(TREATMENTS.darkcircles.name).toBe("Dark Circles Treatment");
    expect(TREATMENTS.coolbleph.name).toBe("CO₂ Non-Surgical Blepharoplasty");
    expect(TREATMENTS.teartrough.priceFrom).toEqual({ london: 249, glasgow: 249 });
  });

  it("every concern maps to a treatment on the menu, and every treatment has a display price for both locations", () => {
    for (const id of Object.values(CONCERN_TO_TREATMENT)) {
      expect(TREATMENTS[id]).toBeTruthy();
    }
    for (const t of Object.values(TREATMENTS)) {
      expect(t.price.london).toBeTruthy();
      expect(t.price.glasgow).toBeTruthy();
      expect(t.priceFrom.london).toBeGreaterThanOrEqual(0);
      expect(t.priceFrom.glasgow).toBeGreaterThanOrEqual(0);
      // An unpublished price must never surface as a "£0" figure.
      for (const loc of ["london", "glasgow"] as const) {
        if (!hasPublishedPrice(t, loc)) {
          expect(t.price[loc]).toBe(PRICE_AT_CONSULTATION);
          expect(t.price[loc]).not.toMatch(/£\s*0\b/);
        }
      }
    }
  });
});
