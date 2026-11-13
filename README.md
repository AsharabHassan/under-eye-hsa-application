# AI Under-Eye Analyzer · Harley Street Aesthetics

A standalone web-app lead magnet for **Harley Street Aesthetics** (2 Grosvenor Gardens, London, and Ingram House, Glasgow). A visitor takes a selfie, the AI reads the area beneath their eyes — hollowing, dark circles, puffiness, fine lines and crow's feet — and the result recommends **one HSA treatment** for the most visible concern. Leads and a branded PDF report flow into **GoHighLevel**. Primary CTA: **Book your consultation**.

> The tool is a **cosmetic, informational pre-consultation guide — not a medical assessment or diagnosis.** It never names conditions or causes; suitability is always confirmed by our Harley Street medical team.

## Routes

| Route | Clinic |
|---|---|
| `/` | London (default) |
| `/london` | London (kept for existing links) |
| `/glasgow` | Glasgow |

The route sets the address, phone, booking URL and the `hsa-clinic-<location>` GHL tag.

## Treatment matching

Claude rates five concerns (0–100) and proposes a lead treatment; `lib/plan.ts` validates the proposal against the scores and overrides when they contradict.

| Dominant concern (≥ 35) | Lead treatment |
|---|---|
| Hollowing | Tear trough filler |
| Dark circles | Dark Circles Reduction |
| Puffiness / bags | Cool Bleph non-surgical blepharoplasty (never filler) |
| Fine lines / crepey skin | Morpheus8 |
| Crow's feet | Anti-wrinkle injections |
| `consultation` / `alternative` outcome | Doctor-led consultation |

With no concern ≥ 35, Claude's pick stands, else Dark Circles Reduction. A secondary "also worth discussing" treatment is shown for the next concern ≥ 30.

**Prices:** HSA's under-eye prices have not been supplied. Every treatment shows "Price confirmed at your consultation" with `priceFrom: 0` (marked `TODO(HSA): confirm price` in `lib/constants.ts`). A `priceFrom` of 0 is never shown as "£0".

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Motion · MediaPipe Tasks Vision · Anthropic SDK · Zustand · jsPDF · Vitest.

## Local development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # vitest
npm run build
```

Environment: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `GHL_WEBHOOK_URL`, `GHL_API_TOKEN`, `GHL_LOCATION_ID`, optional `GHL_REPORT_FIELD_KEY`, `NEXT_PUBLIC_SITE_URL` (default `https://undereye.harleystreetaesthetic.clinic`), `NEXT_PUBLIC_BOOKING_URL`, `NEXT_PUBLIC_GLASGOW_BOOKING_URL`, `NEXT_PUBLIC_BOOKING_CALENDAR_URL`, `NEXT_PUBLIC_GLASGOW_BOOKING_CALENDAR_URL`, and the optional Meta ids `NEXT_PUBLIC_META_PIXEL_ID` / `META_DATASET_ID` (no pixel id is hard-coded).

## Go-live checklist

- HSA under-eye prices per location → `TREATMENTS` in `lib/constants.ts`.
- Verified patient reviews → `lib/reviews.ts` (section hidden while empty).
- Consented under-eye before/after pairs → `components/result/ResultsGallery.tsx` (section hidden while empty).
- Medical sign-off on the routing table, the prompt scope in `lib/prompts/system-undereye.ts` and the treatment copy.
- GoHighLevel credentials, production domain/DNS, optional Meta ids.
