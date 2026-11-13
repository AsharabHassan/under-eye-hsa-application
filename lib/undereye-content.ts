// ─────────────────────────────────────────────────────────────────────────────
// Fixed, clinic-authored copy for the under-eye report: what each condition is
// and why it happens, and the recommendation that sells the matched HSA
// treatment. Claude never writes this copy, so it can be reviewed in one place.
// Wording is comparative-but-defensible for UK advertising rules ("recommended
// by our doctors", "why it goes further") — never an unqualified "the best".
// ─────────────────────────────────────────────────────────────────────────────

import type { ConcernKey, TreatmentId } from "./types";

export interface Condition {
  /** Clinical name shown large. */
  name: string;
  /** Everyday name ("Often called …"). */
  commonName: string;
  what: string;
  cause: string;
}

export const CONDITIONS: Record<ConcernKey, Condition> = {
  hooding: {
    name: "Dermatochalasis",
    commonName: "hooded or heavy upper eyelids",
    what: "Loose, folded skin on the upper eyelid that sits closer to the lashes, making the eyes look heavier, smaller or more tired than you feel.",
    cause:
      "With time the thin eyelid skin loses collagen and elasticity and the brow can settle lower, so the extra skin folds over; genetics and sun exposure play a part.",
  },
  hollowing: {
    name: "Tear trough hollowing",
    commonName: "under-eye hollows",
    what: "A groove or shadow between the lower eyelid and the top of the cheek. Because the area dips, light catches it unevenly, which reads as darkness and tiredness even when you are well rested.",
    cause:
      "Gradual loss of the soft volume and fat that support the under-eye, the natural thinning of the skin with age, and inherited bone structure.",
  },
  darkcircles: {
    name: "Periorbital hyperpigmentation",
    commonName: "dark circles",
    what: "Brown, grey or bluish darkening of the skin beneath the eyes that stays visible even after a good night's sleep.",
    cause:
      "Extra pigment in the thin under-eye skin — often inherited and more common in deeper skin tones — and blood vessels showing through skin that is thinner than anywhere else on the face. Rubbing, allergies and sun make it more noticeable.",
  },
  puffiness: {
    name: "Under-eye bags",
    commonName: "puffiness",
    what: "Fullness or a soft bag beneath the lower lid, sometimes with hooding of the upper lid, which can make the eyes look heavy and tired.",
    cause:
      "With time the skin and supporting tissues around the eye lose firmness, so the natural fat pads beneath the eye push forward; fluid retention, sleep and genetics add to it.",
  },
  finelines: {
    name: "Crepey under-eye skin",
    commonName: "fine lines & crepey skin",
    what: "Fine creasing or a crinkled, papery texture beneath the eyes that shows more when you smile or apply concealer.",
    cause:
      "The under-eye skin is very thin and loses collagen and elasticity earlier than the rest of the face; sun exposure and repeated movement deepen the lines.",
  },
  crowsfeet: {
    name: "Lateral canthal lines",
    commonName: "crow's feet",
    what: "Lines that fan out from the outer corner of the eye, first when you smile and later even at rest.",
    cause:
      "Years of repeated smiling and squinting contract the muscle around the eye, creasing the thin skin above it.",
  },
};

export interface Comparison {
  alternative: string;
  limitation: string;
  ours: string;
}

export interface TreatmentPitch {
  subtitle: string;
  lead: string;
  comparisons: [Comparison, Comparison, Comparison];
}

export const PITCH: Partial<Record<TreatmentId, TreatmentPitch>> = {
  teartrough: {
    subtitle: "Recommended by our doctors for under-eye hollows",
    lead: "When the darkness under your eyes comes from a hollow, the fix is to restore the lost volume — so light falls evenly again and the shadow lifts.",
    comparisons: [
      {
        alternative: "Eye creams",
        limitation: "can't replace lost volume, so the groove and its shadow stay.",
        ours: "Premium Juvéderm® or Sosum filler gently fills the groove itself.",
      },
      {
        alternative: "Concealer",
        limitation: "hides the shadow for the day but settles into the hollow.",
        ours: "A smoother contour means less coverage needed, every day — results last 9–24 months.",
      },
      {
        alternative: "Needle-only injection",
        limitation: "carries more risk of bruising in this delicate area.",
        ours: "Our GMC-registered doctors use a gentle cannula technique, with a free review at 2 weeks.",
      },
    ],
  },
  darkcircles: {
    subtitle: "Recommended by our doctors for dark circles",
    lead: "Dark circles sit in skin that is thinner and more sensitive than anywhere else on the face, so they need treatment that works on the pigment and strengthens the skin — not just covers it.",
    comparisons: [
      {
        alternative: "Eye creams",
        limitation: "barely reach the pigment beneath the thin under-eye skin.",
        ours: "Our treatment works on the pigment and the skin quality where the darkness sits.",
      },
      {
        alternative: "Concealer",
        limitation: "hides the shadow for the day but changes nothing underneath.",
        ours: "Brighter, stronger skin means you need less coverage over time.",
      },
      {
        alternative: "Filler alone",
        limitation: "restores volume but doesn't treat brown or bluish pigment.",
        ours: "Your practitioner tailors the plan to your skin — and advises if a hollow needs filler too.",
      },
    ],
  },
  coolbleph: {
    subtitle: "Recommended by our doctors for bags, hooding and crepey skin",
    lead: "When the skin around the eyes has lost firmness, the answer is to tighten and renew it — which is exactly what CO₂ non-surgical blepharoplasty does, without surgery.",
    comparisons: [
      {
        alternative: "Eyelid surgery",
        limitation: "means cuts, stitches and weeks of recovery.",
        ours: "Precise fractional CO₂ laser tightens the skin with no incisions and only a few days of social downtime.",
      },
      {
        alternative: "Filler",
        limitation: "can make puffiness look worse — it adds volume where there is already fullness.",
        ours: "We tighten and lift the skin instead, so bags and hooding look reduced.",
      },
      {
        alternative: "Eye creams",
        limitation: "can't rebuild the collagen that firm under-eye skin depends on.",
        ours: "New collagen builds over three months, firming crepey skin and softening fine lines.",
      },
    ],
  },
  antiwrinkle: {
    subtitle: "Recommended by our doctors for crow's feet",
    lead: "Crow's feet are made by movement, so the most effective way to soften them is to relax that movement — gently, so your smile stays yours.",
    comparisons: [
      {
        alternative: "Creams and serums",
        limitation: "can't relax the muscle that creases the skin.",
        ours: "A precise, doctor-placed dose softens the lines at their source.",
      },
      {
        alternative: "Heavy-handed injections",
        limitation: "can leave a frozen, unnatural look.",
        ours: "Our doctors use a light, measured dose for a natural, rested result.",
      },
      {
        alternative: "Laser alone",
        limitation: "improves texture but the lines keep forming with every smile.",
        ours: "Results build over about two weeks and last around three to four months.",
      },
    ],
  },
};

export const WHY_HSA = [
  "Doctor-led clinics in London and Glasgow",
  "Treatments performed by GMC-registered doctors",
  "Matched to what your photo actually shows",
  "Free online consultation, with no pressure to book",
] as const;
