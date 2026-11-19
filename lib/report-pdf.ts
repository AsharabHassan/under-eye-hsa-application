import { jsPDF } from "jspdf";

// ─────────────────────────────────────────────────────────────────────────────
// Harley Street Aesthetics under-eye report — dark, gold, premium. Theme-driven palette.
// Pure jsPDF (no browser canvas) so it's unit-testable; the browser helper
// (lib/report.ts) renders the eye band + side crops.
// ─────────────────────────────────────────────────────────────────────────────

type RGB = [number, number, number];

export interface ReportPalette {
  bg: RGB;
  panel: RGB;
  accent: RGB;
  accentDeep: RGB;
  heading: RGB;
  body: RGB;
  faint: RGB;
  line: RGB;
  badgeText: RGB;
}

export interface ReportSide {
  title: string;
  cropDataUrl?: string | null;
  covered: boolean;
}

export interface ReportConcern {
  title: string;
  blurb: string;
  /** Visibility of this concern (0–100). */
  severity: number;
  /** Indicative improvement potential (0–100). */
  improvement: number | null;
  /** True for the concern the recommended treatment addresses. */
  lead: boolean;
}

export interface ReportTreatment {
  name: string;
  tagline: string;
  description: string;
  course: string;
  price: string;
  /** False when the clinic has not published a price ("confirmed at consultation"). */
  pricePublished?: boolean;
}

export interface ReportInput {
  clinicName: string;
  treatmentName: string;
  byline: string;
  mono?: string;
  palette: ReportPalette;
  phone: string;
  email: string;
  /** Full https address of the online booking page (linked, not printed). */
  bookingUrl: string;
  addressLines: string[];
  preparedFor?: string;
  dateStr: string;
  verdictLabel: string;
  headline: string;
  score: number;
  narrative: string;
  encouragement: string;
  usedPhoto: boolean;
  /** True when a side couldn't be read (glasses, hair, shadow, concealer). */
  obscuredNotice: boolean;
  /** True when makeup appeared to soften the read. */
  makeupNotice?: boolean;
  eyesImageDataUrl?: string | null;
  eyesImageAspect?: number; // width / height — preserved so the crop isn't stretched
  sides: ReportSide[];
  concerns: ReportConcern[];
  treatment: ReportTreatment;
  treatmentReason: string;
  secondaryTreatment: ReportTreatment | null;
  priceNote: string;
  disclaimer: string;
}

const PW = 210;
const PH = 297;
const M = 17;
const CW = PW - M * 2;
const BODYW = 132;

export function buildReportPdf(input: ReportInput): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const T = input.treatmentName;
  const P = input.palette;
  let page = 1;

  const pageBg = () => {
    doc.setFillColor(...P.bg);
    doc.rect(0, 0, PW, PH, "F");
  };
  const footer = () => {
    doc.setDrawColor(...P.line);
    doc.setLineWidth(0.2);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...P.faint);
    doc.text(input.disclaimer, M, PH - 10, { maxWidth: CW - 16 });
    doc.text(String(page), PW - M, PH - 10, { align: "right" });
  };
  const runningHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...P.accentDeep);
    doc.text(input.clinicName.toUpperCase(), M, 14);
    doc.setTextColor(...P.faint);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`${T} Analysis Report`, PW - M, 14, { align: "right" });
    doc.setDrawColor(...P.line);
    doc.setLineWidth(0.2);
    doc.line(M, 18, PW - M, 18);
  };
  const sectionTitle = (text: string, yy: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...P.heading);
    doc.text(text, M, yy);
    doc.setDrawColor(...P.accent);
    doc.setLineWidth(0.6);
    doc.line(M, yy + 2.5, M + 16, yy + 2.5);
  };
  const tagPill = (text: string, x: number, yy: number, color: RGB) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    const w = doc.getTextWidth(text) + 4;
    doc.setFillColor(...color);
    doc.roundedRect(x, yy, w, 4.6, 1, 1, "F");
    doc.setTextColor(...P.badgeText);
    doc.text(text, x + 2, yy + 3.2);
  };
  const centerSpaced = (text: string, cx: number, yy: number, charSpace: number) => {
    const w = doc.getTextWidth(text) + charSpace * Math.max(0, text.length - 1);
    doc.text(text, cx - w / 2, yy, { charSpace });
  };

  let y = 0;
  const ensure = (need: number) => {
    if (y + need > PH - 20) {
      footer();
      doc.addPage();
      page += 1;
      pageBg();
      runningHeader();
      y = 28;
    }
  };

  // ══ COVER ══════════════════════════════════════════════════════════════
  pageBg();
  doc.setDrawColor(...P.line);
  doc.setLineWidth(0.3);
  doc.rect(8, 8, PW - 16, PH - 16, "S");

  if (input.mono) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...P.accentDeep);
    centerSpaced(input.mono, PW / 2, 25, 1.2);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...P.heading);
  doc.text(input.clinicName, PW / 2, 34, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...P.accentDeep);
  doc.text(input.byline.toUpperCase(), PW / 2, 40, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...P.faint);
  centerSpaced(`${T.toUpperCase()} · ANALYSIS REPORT`, PW / 2, 48, 1.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...P.body);
  const who = input.preparedFor ? `Prepared for ${input.preparedFor}` : "";
  doc.text([who, input.dateStr].filter(Boolean).join("   ·   "), PW / 2, 54, {
    align: "center",
  });

  // score dial
  const cx = PW / 2;
  const cy = 86;
  const rr = 20;
  const score = Math.max(0, Math.min(100, input.score));
  const START = -Math.PI / 2;
  const END = START + (score / 100) * Math.PI * 2;

  doc.setDrawColor(...P.line);
  doc.setLineWidth(1.1);
  doc.circle(cx, cy, rr, "S");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    doc.setDrawColor(...P.line);
    doc.setLineWidth(0.3);
    doc.line(
      cx + Math.cos(a) * (rr + 2.5),
      cy + Math.sin(a) * (rr + 2.5),
      cx + Math.cos(a) * (rr + 4),
      cy + Math.sin(a) * (rr + 4),
    );
  }
  doc.setLineWidth(2.3);
  doc.setLineCap(1);
  const SEG = Math.max(24, Math.round((score / 100) * 90));
  for (let i = 0; i < SEG; i++) {
    const t = (i + 0.5) / SEG;
    const a0 = START + (i / SEG) * (END - START);
    const a1 = START + ((i + 1) / SEG) * (END - START);
    doc.setDrawColor(
      Math.round(P.accentDeep[0] + (P.accent[0] - P.accentDeep[0]) * t),
      Math.round(P.accentDeep[1] + (P.accent[1] - P.accentDeep[1]) * t),
      Math.round(P.accentDeep[2] + (P.accent[2] - P.accentDeep[2]) * t),
    );
    doc.line(
      cx + Math.cos(a0) * rr,
      cy + Math.sin(a0) * rr,
      cx + Math.cos(a1) * rr,
      cy + Math.sin(a1) * rr,
    );
  }
  doc.setLineCap(0);
  const kx = cx + Math.cos(END) * rr;
  const ky = cy + Math.sin(END) * rr;
  doc.setFillColor(...P.bg);
  doc.circle(kx, ky, 2.3, "F");
  doc.setDrawColor(...P.accent);
  doc.setLineWidth(0.7);
  doc.circle(kx, ky, 2.3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...P.heading);
  doc.text(String(input.score), cx, cy + 2, { align: "center" });
  doc.setFontSize(5.6);
  doc.setTextColor(...P.accentDeep);
  centerSpaced("SUITABILITY", cx, cy + 9, 1);

  // verdict + headline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...P.accentDeep);
  centerSpaced(input.verdictLabel.toUpperCase(), cx, 120, 1.5);
  doc.setFontSize(19);
  doc.setTextColor(...P.heading);
  const hl = doc.splitTextToSize(input.headline, CW - 24);
  doc.text(hl, cx, 130, { align: "center" });
  y = 130 + hl.length * 8 + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...P.body);
  const narr = doc.splitTextToSize(input.narrative, BODYW);
  doc.text(narr, cx, y, { align: "center" });
  y += narr.length * 5.6 + 4;
  if (input.encouragement) {
    doc.setTextColor(...P.heading);
    const enc = doc.splitTextToSize(input.encouragement, BODYW);
    doc.text(enc, cx, y, { align: "center" });
    y += enc.length * 5.6 + 4;
  }

  const noticePanel = (title: string, text: string) => {
    y += 2;
    doc.setFillColor(...P.panel);
    doc.roundedRect(M + 6, y, CW - 12, 17, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...P.accentDeep);
    doc.text(title, M + 11, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...P.body);
    const bn = doc.splitTextToSize(text, CW - 22);
    doc.text(bn, M + 11, y + 11);
    y += 17;
  };
  if (input.usedPhoto && input.obscuredNotice) {
    noticePanel(
      "One side was covered",
      "Glasses, hair, shadow or heavy concealer hid part of the eye area, so that read was kept light. It will be assessed properly at your consultation.",
    );
  }
  if (input.usedPhoto && input.makeupNotice) {
    noticePanel(
      "Makeup noticed",
      "Concealer or foundation may be softening how the area appears in the photo, so your true starting point may differ from this read.",
    );
  }
  footer();

  // ══ CONTENT — eye band + concerns ═════════════════════════════════════
  doc.addPage();
  page += 1;
  pageBg();
  runningHeader();
  y = 28;

  if (input.usedPhoto && input.eyesImageDataUrl) {
    const aspect =
      input.eyesImageAspect && input.eyesImageAspect > 0
        ? input.eyesImageAspect
        : 2.4;
    const maxW = CW;
    const maxH = 70;
    let imgW = maxW;
    let imgH = maxW / aspect;
    if (imgH > maxH) {
      imgH = maxH;
      imgW = maxH * aspect;
    }
    ensure(imgH + 18);
    sectionTitle("Your eye areas", y);
    y += 9;
    const ix = (PW - imgW) / 2;
    doc.setDrawColor(...P.line);
    doc.setLineWidth(0.4);
    doc.roundedRect(ix - 1.5, y - 1.5, imgW + 3, imgH + 3, 2, 2, "S");
    try {
      doc.addImage(input.eyesImageDataUrl, "JPEG", ix, y, imgW, imgH);
    } catch {
      /* ignore */
    }
    y += imgH + 6;

    if (input.sides.length > 0) {
      ensure(22);
      const cellW = 40;
      const gap = 6;
      const totalW = input.sides.length * cellW + (input.sides.length - 1) * gap;
      let sx = (PW - totalW) / 2;
      for (const s of input.sides) {
        if (s.cropDataUrl) {
          try {
            doc.addImage(s.cropDataUrl, "JPEG", sx, y, cellW, 18);
          } catch {
            doc.setFillColor(...P.panel);
            doc.rect(sx, y, cellW, 18, "F");
          }
        } else {
          doc.setFillColor(...P.panel);
          doc.rect(sx, y, cellW, 18, "F");
        }
        doc.setDrawColor(...P.line);
        doc.setLineWidth(0.3);
        doc.rect(sx, y, cellW, 18, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...P.heading);
        doc.text(s.title, sx + cellW / 2, y + 22, { align: "center" });
        if (s.covered) tagPill("COVERED", sx + cellW / 2 - 8, y + 23.5, P.faint);
        sx += cellW + gap;
      }
      y += 30;
    }
  }

  if (input.concerns.length > 0) {
    ensure(14);
    sectionTitle("What the analysis could see", y);
    y += 9;
    for (const c of input.concerns) {
      const blurbLines = doc.splitTextToSize(c.blurb, CW - 4);
      const hasBar = typeof c.improvement === "number" && c.severity >= 15;
      // Title + visibility bar (+ improvement bar) + blurb lines + row gap.
      const rowH = (hasBar ? 21 : 16) + blurbLines.length * 4.4 + 4;
      ensure(rowH + 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...P.heading);
      doc.text(c.title, M, y + 4);
      const tagX = M + doc.getTextWidth(c.title) + 3;
      if (c.lead) tagPill("MAIN CONCERN", tagX, y + 0.8, P.accent);

      // visibility bar
      let by = y + 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...P.faint);
      doc.text("VISIBILITY", M, by, { charSpace: 0.5 });
      doc.setTextColor(...P.accentDeep);
      doc.text(`${Math.round(c.severity)}%`, PW - M, by, { align: "right" });
      by += 1.6;
      doc.setFillColor(...P.panel);
      doc.roundedRect(M, by, CW, 1.8, 0.9, 0.9, "F");
      doc.setFillColor(...P.accent);
      doc.roundedRect(M, by, (CW * Math.max(0, Math.min(100, c.severity))) / 100, 1.8, 0.9, 0.9, "F");
      by += 5;

      if (hasBar) {
        const pct = Math.max(0, Math.min(100, c.improvement as number));
        doc.setTextColor(...P.faint);
        doc.text("IMPROVEMENT POTENTIAL", M, by, { charSpace: 0.5 });
        doc.setTextColor(...P.accentDeep);
        doc.text(`+${pct}%`, PW - M, by, { align: "right" });
        by += 1.6;
        doc.setFillColor(...P.panel);
        doc.roundedRect(M, by, CW, 1.8, 0.9, 0.9, "F");
        doc.setFillColor(...P.accentDeep);
        doc.roundedRect(M, by, (CW * pct) / 100, 1.8, 0.9, 0.9, "F");
        by += 5;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.6);
      doc.setTextColor(...P.body);
      doc.text(blurbLines, M, by + 1);
      y += rowH;
    }
  }

  // ══ TREATMENT ═════════════════════════════════════════════════════════
  const treatmentCard = (t: ReportTreatment, lead: boolean) => {
    const desc = doc.splitTextToSize(t.description, CW - 16);
    const reasonLines: string[] =
      lead && input.treatmentReason
        ? doc.splitTextToSize(input.treatmentReason, CW - 16)
        : [];
    const priceInline = t.pricePublished !== false;
    const h =
      28 +
      desc.length * 4.4 +
      (priceInline ? 0 : 5) +
      (reasonLines.length ? 4 + reasonLines.length * 4.4 : 0);
    ensure(h + 4);
    doc.setFillColor(...(lead ? P.panel : P.bg));
    doc.setDrawColor(...(lead ? P.accent : P.line));
    doc.setLineWidth(lead ? 0.5 : 0.3);
    doc.roundedRect(M, y, CW, h, 2.5, 2.5, "FD");
    tagPill(lead ? "RECOMMENDED FOR YOU" : "ALSO WORTH DISCUSSING", M + 5, y + 4, lead ? P.accent : P.faint);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...P.heading);
    doc.text(t.name, M + 5, y + 14);
    if (priceInline) {
      doc.setFontSize(13);
      doc.setTextColor(...P.accentDeep);
      doc.text(t.price, PW - M - 5, y + 14, { align: "right" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...P.accentDeep);
    doc.text(t.tagline, M + 5, y + 19);
    doc.setTextColor(...P.body);
    doc.text(desc, M + 5, y + 24.5);
    let ty = y + 24.5 + desc.length * 4.4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...P.heading);
    doc.text(t.course, M + 5, ty + 1);
    if (!priceInline) {
      ty += 5;
      doc.setTextColor(...P.accentDeep);
      doc.text(t.price, M + 5, ty + 1);
    }
    if (reasonLines.length) {
      ty += 6;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...P.heading);
      doc.text(reasonLines, M + 5, ty + 1);
    }
    y += h + 4;
  };

  ensure(14);
  sectionTitle("Your recommended treatment", y);
  y += 9;
  treatmentCard(input.treatment, true);
  if (input.secondaryTreatment) treatmentCard(input.secondaryTreatment, false);

  ensure(10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...P.faint);
  const pn = doc.splitTextToSize(input.priceNote, CW);
  doc.text(pn, M, y + 2);
  y += pn.length * 3.8 + 8;

  ensure(20);
  doc.setFillColor(...P.accentDeep);
  doc.roundedRect(M, y, CW, 18, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...P.badgeText);
  doc.text("Book your consultation", M + 7, y + 7.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  // The booking page's address is long, so print a short label and make the
  // whole panel a link to it.
  doc.text(`Book online: free consultation   ·   ${input.phone}   ·   ${input.email}`, M + 7, y + 13);
  doc.link(M, y, CW, 18, { url: input.bookingUrl });
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...P.faint);
  doc.text(input.addressLines.join(" · "), M, y);

  footer();
  return doc.output("blob");
}
