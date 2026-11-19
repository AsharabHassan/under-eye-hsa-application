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

Environment (see `.env.local.example`): `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `CRM_WEBHOOK_URL_LONDON`, `CRM_WEBHOOK_URL_GLASGOW`, `GHL_WEBHOOK_URL`, `GHL_API_TOKEN`, `GHL_LOCATION_ID`, optional `GHL_REPORT_FIELD_KEY`, `SKINSCAN_URL` / `SKINSCAN_API_KEY`, `NEXT_PUBLIC_SITE_URL` (default `https://undereye.harleystreetaesthetic.clinic`), `NEXT_PUBLIC_BOOKING_URL`, `NEXT_PUBLIC_GLASGOW_BOOKING_URL` (the "contact our clinic" fallback links), and the optional Meta ids `NEXT_PUBLIC_META_PIXEL_ID` / `META_DATASET_ID` (no pixel id is hard-coded).

## CRM cutover (bookings and leads)

- **Booking:** the consultation calendar is the clinic CRM's free online consultation page, `CRM_BOOKING_URL` in `lib/constants.ts`, for both London and Glasgow. It is used by the result page's booking card, the report email and the PDF. The page (on `app.harleystreetaesthetic.co.uk`) allows framing, so the result page embeds it in an iframe with an "Open the booking page" link under it; it reads no name/email/phone parameters, so nothing is prefilled. `NEXT_PUBLIC_BOOKING_CALENDAR_URL` and `NEXT_PUBLIC_GLASGOW_BOOKING_CALENDAR_URL` are no longer read.
- **Leads:** `/api/lead` POSTs the same JSON payload to the lead's clinic CRM webhook — `CRM_WEBHOOK_URL_LONDON` or `CRM_WEBHOOK_URL_GLASGOW`, chosen by `clinicLocation` — when that variable is set, and to `GHL_WEBHOOK_URL` exactly as before when it is not (`lib/lead-webhook.ts`). The log line `ghl_lead_delivery` shows `destination: "crm" | "ghl"`.
- **Still on GoHighLevel:** the direct GHL API calls in `lib/ghl-contact.ts` (contact upsert + tags) and `lib/ghl-report.ts` (PDF upload, contact field, note, email) are unchanged.

## Go-live checklist

- HSA under-eye prices per location → `TREATMENTS` in `lib/constants.ts`.
- Verified patient reviews → `lib/reviews.ts` (section hidden while empty).
- Consented under-eye before/after pairs → `components/result/ResultsGallery.tsx` (section hidden while empty).
- Medical sign-off on the routing table, the prompt scope in `lib/prompts/system-undereye.ts` and the treatment copy.
- GoHighLevel credentials, production domain/DNS, optional Meta ids.
