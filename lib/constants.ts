import type {
  Bucket,
  ClinicLocationKey,
  ConcernKey,
  TreatmentId,
} from "./types";
export type { ClinicLocationKey } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Clinic brand + contact constants (Harley Street Aesthetics, London & Glasgow).
// Single source of truth for copy that appears across screens. Treatment copy
// and prices live in TREATMENTS below — change them HERE only; the result
// screen, PDF and GoHighLevel payload all read from these tables.
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicLocation {
  key: ClinicLocationKey;
  city: string;
  /** Short name used in kickers ("AI analysis · Glasgow"). */
  shortCity: string;
  lines: string[];
  phone: string;
  phoneHref: string;
}

export const CLINIC = {
  name: "Harley Street Aesthetics",
  shortName: "HSA",
  byline: "London · Glasgow",
  director: "Our Harley Street medical team",
  tagline:
    "London & Glasgow's premier destination for advanced aesthetic medicine",
  // Primary (London flagship) — used wherever a single address is shown.
  addressLines: ["10 Harley Street", "London W1G 9PF"],
  phone: "020 4628 3165",
  phoneHref: "tel:+442046283165",
  whatsapp: "07700 106236",
  whatsappHref: "https://wa.me/447700106236",
  email: "hello@harleystreetaesthetic.co.uk",
  hours: "Mon–Sat · by appointment",
  website: "https://harleystreetaesthetic.co.uk",
  locations: [
    {
      key: "london",
      city: "London",
      shortCity: "London",
      lines: ["10 Harley Street", "London W1G 9PF"],
      phone: "020 4628 3165",
      phoneHref: "tel:+442046283165",
    },
    {
      key: "glasgow",
      city: "Glasgow",
      shortCity: "Glasgow",
      lines: ["5th Floor, Ingram House", "227 Ingram Street, Glasgow G1 1DA"],
      phone: "0141 488 8985",
      phoneHref: "tel:+441414888985",
    },
  ] satisfies ClinicLocation[],
} as const;

export const TRUST_MARKERS = [
  "10 Harley Street, London",
  "Doctor-led & medically supervised",
  "Rated excellent by patients",
  "Flexible payment plans",
] as const;

/** Booking + site URLs (overridable via public env at deploy). */
const CONFIGURED_BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL ??
  process.env.NEXT_PUBLIC_PHOREST_BOOKING_URL;
const WORKING_BOOKING_URL =
  "https://harleystreetaesthetic.co.uk/london/contact/";
const WORKING_GLASGOW_BOOKING_URL =
  "https://harleystreetaesthetic.co.uk/glasgow/contact/";

// Protect production from the retired route if a stale value survives one
// deployment. Other explicitly configured booking providers still work.
export const BOOKING_URL =
  !CONFIGURED_BOOKING_URL ||
  /^https:\/\/harleystreetaesthetic\.co\.uk\/london\/book\/?$/i.test(
    CONFIGURED_BOOKING_URL,
  )
    ? WORKING_BOOKING_URL
    : CONFIGURED_BOOKING_URL;

export const BOOKING_URLS: Record<ClinicLocationKey, string> = {
  london: BOOKING_URL,
  glasgow:
    process.env.NEXT_PUBLIC_GLASGOW_BOOKING_URL ??
    WORKING_GLASGOW_BOOKING_URL,
};

// GoHighLevel consultation calendar. One shared calendar today; each clinic
// can be pointed at its own via public env.
const DEFAULT_CALENDAR_URL =
  "https://link.harleystreetaesthetic.co.uk/widget/bookings/aesthetic-consultant-1";

export const CALENDAR_URLS: Record<ClinicLocationKey, string> = {
  london: process.env.NEXT_PUBLIC_BOOKING_CALENDAR_URL ?? DEFAULT_CALENDAR_URL,
  glasgow:
    process.env.NEXT_PUBLIC_GLASGOW_BOOKING_CALENDAR_URL ??
    process.env.NEXT_PUBLIC_BOOKING_CALENDAR_URL ??
    DEFAULT_CALENDAR_URL,
};

/** UK numbers in the +44 form GoHighLevel's phone field expects. */
export function toE164Uk(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("44")) return `+${digits}`;
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
  return digits;
}

export const DEFAULT_CLINIC_LOCATION: ClinicLocationKey = "london";

export function isClinicLocationKey(
  value: unknown,
): value is ClinicLocationKey {
  return value === "london" || value === "glasgow";
}

export function getClinicLocation(location: ClinicLocationKey) {
  const clinic = CLINIC.locations.find((item) => item.key === location);
  if (!clinic) throw new Error(`Unknown clinic location: ${location}`);
  return {
    ...clinic,
    bookingUrl: BOOKING_URLS[location],
    calendarUrl: CALENDAR_URLS[location],
  };
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://undereye.harleystreetaesthetic.clinic";

// ─────────────────────────────────────────────────────────────────────────────
// Per-bucket presentation metadata. Claude chooses the bucket; this drives the
// result screen's headline, tone colour, gauge band and CTA.
// ─────────────────────────────────────────────────────────────────────────────

export interface BucketMeta {
  label: string;
  /** Default headline used by the deterministic fallback narrative. */
  headline: string;
  /** Encouraging sub-line. */
  blurb: string;
  /** Brand token used to theme the verdict (CSS var name without `--color-`). */
  accent: "peach" | "sage";
  ctaLabel: string;
  /** What the CLIENT sees at the top of the report (`label` stays for GoHighLevel). */
  chip: string;
  /** Indicative gauge band centre for this bucket (0–100). */
  gaugeBand: [number, number];
}

export const BUCKET_META: Record<Bucket, BucketMeta> = {
  great: {
    label: "Strong candidate",
    chip: "Great match for our eye rejuvenation treatments",
    headline: "Your eye area shows exactly what we treat",
    blurb:
      "What's visible in your photo is the kind of eye-area concern our doctor-led treatments are designed to improve.",
    accent: "peach",
    ctaLabel: "Book your consultation",
    gaugeBand: [82, 100],
  },
  good: {
    label: "Good candidate",
    chip: "Good match for our eye rejuvenation treatments",
    headline: "Your eye area could respond well",
    blurb:
      "Your photo shows the kind of subtle change that responds well to treatment — a consultation will confirm the detail.",
    accent: "peach",
    ctaLabel: "Book your consultation",
    gaugeBand: [68, 88],
  },
  consultation: {
    label: "Consultation recommended",
    chip: "Let's look at your eyes together",
    headline: "Let's look at your eye area together",
    blurb:
      "Your eyes are best reviewed by our doctor-led team before we can be sure of the right plan. That's completely normal.",
    accent: "sage",
    ctaLabel: "Book your consultation",
    gaugeBand: [55, 75],
  },
  alternative: {
    label: "Let's explore your options",
    chip: "Let's explore your options",
    headline: "Another approach may suit you better",
    blurb:
      "Your goals may be better met by a different route. A consultation is the best way to find the right one.",
    accent: "sage",
    ctaLabel: "Discuss your options",
    gaugeBand: [40, 60],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// The five under-eye concerns the analysis rates.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConcernMeta {
  key: ConcernKey;
  label: string;
  /** What a high severity means, in the visitor's words. */
  meaning: string;
  /** Short cosmetic line on how treatment helps. */
  blurb: string;
}

export const CONCERN_ORDER: ConcernKey[] = [
  "hooding",
  "hollowing",
  "darkcircles",
  "puffiness",
  "finelines",
  "crowsfeet",
];

export const CONCERNS: Record<ConcernKey, ConcernMeta> = {
  hooding: {
    key: "hooding",
    label: "Upper eyelid hooding",
    meaning: "Heavy, folded or loose skin on the upper eyelid",
    blurb:
      "CO₂ non-surgical blepharoplasty tightens and lifts loose upper-eyelid skin, opening up the eye without surgery.",
  },
  hollowing: {
    key: "hollowing",
    label: "Hollowing",
    meaning: "A groove or shadow between the lower lid and the cheek",
    blurb:
      "Tear trough filler — a soft hyaluronic acid filler placed by a doctor — can gently restore volume in the groove, so the area catches light more evenly.",
  },
  darkcircles: {
    key: "darkcircles",
    label: "Dark circles",
    meaning: "Darker or dull tone in the skin beneath the eyes",
    blurb:
      "Our Dark Circles Treatment aims to brighten pigmented under-eye skin and strengthen thin skin over a short course, for a fresher, more rested look.",
  },
  puffiness: {
    key: "puffiness",
    label: "Puffiness",
    meaning: "Fullness or a soft bag beneath the lower lid",
    blurb:
      "CO₂ non-surgical blepharoplasty tightens the skin around the eyes to reduce the look of under-eye bags and hooding. Filler does not treat puffiness, so suitability is always checked at your consultation.",
  },
  finelines: {
    key: "finelines",
    label: "Fine lines & crepey skin",
    meaning: "Fine creasing or a crinkled, papery texture under the eye",
    blurb:
      "CO₂ non-surgical blepharoplasty resurfaces and firms thin, crepey under-eye skin, softening fine lines as new collagen builds.",
  },
  crowsfeet: {
    key: "crowsfeet",
    label: "Crow's feet",
    meaning: "Lines fanning out from the outer corner of the eye",
    blurb:
      "Anti-wrinkle injections at the outer corner can soften the fan of lines while keeping your expression natural.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Harley Street Aesthetics' under-eye treatment menu. Prices are per location.
// HSA's under-eye prices have NOT been supplied yet — never invent them. Until
// they are confirmed every treatment shows PRICE_AT_CONSULTATION and
// priceFrom 0 (0 = no published price; the UI, PDF and GHL payload hide it).
// ─────────────────────────────────────────────────────────────────────────────

export interface Treatment {
  id: TreatmentId;
  /** Marketing name. */
  name: string;
  /** One-line positioning under the name. */
  tagline: string;
  /** What it does, in cosmetic terms. */
  description: string;
  /** Sessions / course, as stated by the clinic. */
  course: string;
  /** Display price per location. */
  price: Record<ClinicLocationKey, string>;
  /** Numeric starting price per location (for GHL / finance). 0 = not published. */
  priceFrom: Record<ClinicLocationKey, number>;
  /** Concern this treatment leads for (null for consultation). */
  leadsFor: ConcernKey | null;
  /** Short label used in GHL tags/notes. */
  ghlLabel: string;
}

/** Display text used while a treatment has no confirmed published price. */
export const PRICE_AT_CONSULTATION = "Price confirmed at your consultation";

/** True when a treatment has a real, published starting price for the location. */
export function hasPublishedPrice(
  treatment: Treatment,
  location: ClinicLocationKey,
): boolean {
  return treatment.priceFrom[location] > 0;
}

export const TREATMENTS: Record<TreatmentId, Treatment> = {
  darkcircles: {
    id: "darkcircles",
    name: "Dark Circles Treatment",
    tagline: "Brighten and strengthen delicate under-eye skin",
    description:
      "Our dark-circle treatment is designed to brighten pigmented under-eye skin and strengthen thin skin, helping the area look fresher and more rested. Your practitioner tailors the approach to your skin.",
    course: "A short course — your practitioner confirms the number of sessions",
    // TODO(HSA): confirm price
    price: { london: PRICE_AT_CONSULTATION, glasgow: PRICE_AT_CONSULTATION },
    // TODO(HSA): confirm price
    priceFrom: { london: 0, glasgow: 0 },
    leadsFor: "darkcircles",
    ghlLabel: "Dark Circles Treatment",
  },
  teartrough: {
    id: "teartrough",
    name: "Tear trough filler",
    tagline: "Restore the volume beneath the eye",
    description:
      "Premium hyaluronic acid filler (Juvéderm® or Sosum) is placed by one of our GMC-registered doctors using a gentle cannula technique, softening the hollow between the lower lid and the cheek so shadows lift and the area looks rested.",
    course: "Usually one visit · free review at 2 weeks · results last 9–24 months · no downtime",
    // From harleystreetaesthetic.co.uk/london/pricing and /glasgow/pricing (Oct 2026).
    price: { london: "1 ml £249–£299", glasgow: "1 ml £249–£299" },
    priceFrom: { london: 249, glasgow: 249 },
    leadsFor: "hollowing",
    ghlLabel: "Tear trough filler £249–£299",
  },
  coolbleph: {
    id: "coolbleph",
    name: "CO₂ Non-Surgical Blepharoplasty",
    tagline: "Lift and tighten the skin around the eyes — without surgery",
    description:
      "Precise fractional CO₂ laser resurfaces and tightens the delicate skin around the eyes, firming crepey skin, softening fine lines and reducing the look of hooding and under-eye bags — a non-surgical alternative to eyelid surgery.",
    course: "Usually 1–3 sessions · a few days of social downtime · results build over 3 months",
    // TODO(HSA): confirm price
    price: { london: PRICE_AT_CONSULTATION, glasgow: PRICE_AT_CONSULTATION },
    // TODO(HSA): confirm price
    priceFrom: { london: 0, glasgow: 0 },
    leadsFor: "puffiness",
    ghlLabel: "CO2 Non-Surgical Blepharoplasty",
  },
  antiwrinkle: {
    id: "antiwrinkle",
    name: "Anti-wrinkle injections",
    tagline: "Soften crow's feet, keep your expression",
    description:
      "A precise, doctor-placed dose relaxes the muscle that fans lines out from the outer corner of the eye, softening crow's feet while your expression stays natural.",
    course: "Single visit · results build over around two weeks",
    // TODO(HSA): confirm price
    price: { london: PRICE_AT_CONSULTATION, glasgow: PRICE_AT_CONSULTATION },
    // TODO(HSA): confirm price
    priceFrom: { london: 0, glasgow: 0 },
    leadsFor: "crowsfeet",
    ghlLabel: "Anti-wrinkle injections",
  },
  consultation: {
    id: "consultation",
    name: "Doctor-led consultation",
    tagline: "The right plan starts with a proper look",
    description:
      "Some under-eye concerns need our medical team to examine the area in person before recommending anything. Your consultation sets out the options that genuinely suit you, with no obligation to book treatment.",
    course: "One appointment with our Harley Street medical team",
    // TODO(HSA): confirm price
    price: { london: PRICE_AT_CONSULTATION, glasgow: PRICE_AT_CONSULTATION },
    // TODO(HSA): confirm price
    priceFrom: { london: 0, glasgow: 0 },
    leadsFor: null,
    ghlLabel: "Consultation first",
  },
};

export const TREATMENT_NOTE =
  "Your exact plan and price are confirmed at your consultation, where our Harley Street medical team checks your suitability in person. Results vary from person to person and are not guaranteed.";

/** Concerns the analysis covers, for the result screen's "what it treats" context. */
export const TREATMENT_CONCERNS = [
  "Hollowing & tear troughs",
  "Dark circles",
  "Puffiness & under-eye bags",
  "Fine lines & crepey skin",
  "Crow's feet",
] as const;

export const DISCLAIMER =
  "This tool offers general cosmetic information to help you prepare for a consultation. It is not a medical assessment or diagnosis, and it cannot identify the cause of any under-eye change. Suitability and safety are confirmed by a qualified practitioner. If you have any eye pain, sudden swelling, a change in vision, or a lump or mark that is new or changing, please see a doctor.";
