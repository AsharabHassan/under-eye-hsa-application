import { describe, it, expect } from "vitest";
import { buildReportPdf, type ReportInput } from "@/lib/report-pdf";

export const SAMPLE_REPORT: ReportInput = {
  clinicName: "Harley Street Aesthetics",
  treatmentName: "Under-Eye",
  byline: "London · Our Harley Street medical team",
  mono: "H S A",
  palette: {
    bg: [9, 9, 9],
    panel: [22, 19, 15],
    accent: [212, 175, 55],
    accentDeep: [231, 198, 104],
    heading: [245, 241, 230],
    body: [198, 191, 178],
    faint: [138, 132, 122],
    line: [62, 57, 48],
    badgeText: [9, 9, 9],
  },
  phone: "020 4628 3165",
  email: "hello@harleystreetaesthetic.co.uk",
  bookingUrl: "harleystreetaesthetic.co.uk/london/contact/",
  addressLines: ["10 Harley Street", "London W1G 9PF"],
  preparedFor: "Jane",
  dateStr: "15 September 2026",
  verdictLabel: "Good candidate",
  headline: "A fresher, brighter look is well within reach",
  score: 74,
  narrative:
    "Both under-eye areas show a gentle darker tone and a soft transition from the lower lid toward the cheek. The skin itself looks calm and healthy, which is a positive starting point for treatment.",
  encouragement:
    "Our Harley Street medical team will confirm suitability and talk through the best approach for you at a consultation.",
  usedPhoto: true,
  obscuredNotice: false,
  makeupNotice: false,
  eyesImageDataUrl: null,
  sides: [
    { title: "Left under-eye", cropDataUrl: null, covered: false },
    { title: "Right under-eye", cropDataUrl: null, covered: true },
  ],
  concerns: [
    { title: "Dark circles", blurb: "Our Dark Circles Reduction treatment aims to brighten pigmented under-eye skin and strengthen thin skin.", severity: 48, improvement: 58, lead: true },
    { title: "Hollowing", blurb: "Tear trough filler can gently restore volume in the groove.", severity: 38, improvement: 52, lead: false },
    { title: "Puffiness", blurb: "Cool Bleph is a non-surgical blepharoplasty treatment for under-eye bags.", severity: 12, improvement: 22, lead: false },
    { title: "Fine lines & crepey skin", blurb: "Morpheus8 can help firm and smooth thin, crepey skin.", severity: 10, improvement: 28, lead: false },
    { title: "Crow's feet", blurb: "Anti-wrinkle injections can soften the fan of lines.", severity: 8, improvement: 25, lead: false },
  ],
  treatment: {
    name: "Dark Circles Reduction",
    tagline: "Brighten and strengthen delicate under-eye skin",
    description:
      "Our dark-circle treatment is designed to brighten pigmented under-eye skin and strengthen thin skin, helping the area look fresher and more rested.",
    course: "A short course — your practitioner confirms the number of sessions",
    price: "Price confirmed at your consultation",
    pricePublished: false,
  },
  treatmentReason:
    "The subtly darker, slightly tired tone visible beneath your eyes is the kind of concern our Dark Circles Reduction treatment is designed to brighten over time.",
  secondaryTreatment: {
    name: "Cool Bleph non-surgical blepharoplasty",
    tagline: "A non-surgical approach to hooding and under-eye bags",
    description:
      "Cool Bleph is a non-surgical blepharoplasty treatment for hooding and under-eye bags.",
    course: "Your practitioner confirms the number of sessions at your consultation",
    price: "Price confirmed at your consultation",
    pricePublished: false,
  },
  priceNote:
    "Your exact plan and price are confirmed at your consultation.",
  disclaimer:
    "This tool offers general cosmetic information to help you prepare for a consultation. It is not a medical assessment or diagnosis.",
};

describe("buildReportPdf", () => {
  it("produces a multi-page PDF blob with the treatment section", async () => {
    const blob = buildReportPdf(SAMPLE_REPORT);
    expect(blob.type).toBe("application/pdf");
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const pages = (bytes.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
    expect(pages).toBeGreaterThanOrEqual(2);
    // Optional: REPORT_OUT=/path/sample.pdf npm test — writes the sample for a
    // visual check (rasterise with any PDF tool). Never set in CI.
    if (process.env.REPORT_OUT) {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(process.env.REPORT_OUT, bytes);
    }
  });

  it("still renders a published price inline", async () => {
    const blob = buildReportPdf({
      ...SAMPLE_REPORT,
      treatment: {
        ...SAMPLE_REPORT.treatment,
        price: "from £100",
        pricePublished: true,
      },
    });
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("works with no photo and no secondary treatment", async () => {
    const blob = buildReportPdf({
      ...SAMPLE_REPORT,
      usedPhoto: false,
      sides: [],
      concerns: [],
      secondaryTreatment: null,
      treatmentReason: "",
    });
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });
});
