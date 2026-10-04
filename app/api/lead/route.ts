import { isIP } from "node:net";
import { z } from "zod";
import {
  buildGhlPayload,
  createServerMetaConversion,
  META_DATASET_ID,
  PRODUCTION_ORIGIN,
} from "@/lib/ghl";
import { serverEnv } from "@/lib/env";
import { ensureLeadRoutingInGhl } from "@/lib/ghl-contact";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";

const DELIVERY_ATTEMPTS = 3;
const WEBHOOK_TIMEOUT_MS = 5_000;

const shortText = z.string().trim().min(1).max(200);
const concernKey = z.enum([
  "hollowing",
  "darkcircles",
  "puffiness",
  "finelines",
  "crowsfeet",
]);
const treatmentId = z.enum([
  "darkcircles",
  "teartrough",
  "coolbleph",
  "morpheus8",
  "antiwrinkle",
  "consultation",
]);
const percent = z.number().finite().min(0).max(100);

const leadSchema = z
  .object({
    firstName: shortText,
    lastName: shortText,
    email: z.string().trim().email().max(320),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(32)
      .refine((value) => value.replace(/\D/g, "").length >= 7),
  })
  .strict()
  .transform(
    ({ firstName, lastName, email, phone }): Lead => ({
      firstName,
      lastName,
      email,
      phone,
    }),
  );

const resultSchema = z
  .object({
    bucket: z.enum(["great", "good", "consultation", "alternative"]),
    score: percent,
    hardFlags: z.array(z.string().max(200)).max(25),
    softFlagged: z.boolean(),
    routedReason: z.string().max(2_000),
    narrative: z
      .object({
        headline: z.string().max(500),
        narrative: z.string().max(8_000),
        observedAreas: z.array(z.string().max(200)).max(20),
        encouragement: z.string().max(2_000),
      })
      .strict(),
    narrativeSource: z.enum(["claude", "fallback"]),
    usedPhoto: z.boolean(),
    sidesObscured: z.array(z.enum(["left", "right"])).max(2),
    makeupDetected: z.boolean(),
    concernSeverity: z.partialRecord(concernKey, percent),
    concernImprovement: z.partialRecord(concernKey, percent),
    framingAdequate: z.boolean(),
    treatment: z
      .object({
        lead: treatmentId,
        secondary: treatmentId.nullable(),
        reason: z.string().max(1_000),
        source: z.enum(["claude", "guard"]),
      })
      .strict(),
  })
  .strict();

const attributionSchema = z
  .object({
    fbp: z.string().trim().max(255).nullable(),
    fbc: z.string().trim().max(255).nullable(),
    eventSourceUrl: z.string().trim().max(2_048).nullable(),
  })
  .strict();

export const leadRequestSchema = z
  .object({
    lead: leadSchema,
    result: resultSchema,
    clinicLocation: z.enum(["london", "glasgow"]).default("london"),
    imageProcessingConsent: z.literal(true),
    imageProcessingConsentAt: z.string().datetime(),
    metaTrackingConsent: z.boolean(),
    attribution: attributionSchema.optional(),
  })
  .strict();

/** First x-forwarded-for hop is the client address on Vercel. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0].trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "";
  return isIP(candidate) ? candidate : null;
}

function requestUserAgent(request: Request): string | null {
  const userAgent = request.headers.get("user-agent")?.trim();
  return userAgent ? userAgent.slice(0, 1_024) : null;
}

/** Only the real same-origin production app may enqueue a Meta conversion. */
export function isProductionMetaRequest(request: Request): boolean {
  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin.toLowerCase();
  } catch {
    return false;
  }

  if (requestOrigin !== PRODUCTION_ORIGIN.toLowerCase()) return false;

  const originHeader = request.headers.get("origin")?.trim().toLowerCase();
  if (originHeader !== PRODUCTION_ORIGIN.toLowerCase()) return false;

  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  return !fetchSite || fetchSite === "same-origin";
}

export interface DeliveryResult {
  delivered: boolean;
  attempts: number;
}

export async function deliverWebhook(
  url: string,
  payload: unknown,
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    wait?: (milliseconds: number) => Promise<void>;
  } = {},
): Promise<DeliveryResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? WEBHOOK_TIMEOUT_MS;
  const wait =
    options.wait ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  for (let attempt = 1; attempt <= DELIVERY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (response.ok) return { delivered: true, attempts: attempt };
    } catch {
      // Network errors and aborts are retried below.
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < DELIVERY_ATTEMPTS) await wait(250 * attempt);
  }

  return { delivered: false, attempts: DELIVERY_ATTEMPTS };
}

// Forward the lead to GoHighLevel. Delivery failure never blocks result access.
export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const parsed = leadRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "invalid request" },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const submittedAt = new Date().toISOString();
  const metaTrackingAllowed =
    body.metaTrackingConsent &&
    META_DATASET_ID.length > 0 &&
    isProductionMetaRequest(request);
  const meta = metaTrackingAllowed
    ? createServerMetaConversion({
        lead: body.lead,
        attribution: body.attribution,
        clientUserAgent: requestUserAgent(request),
        clientIpAddress: clientIp(request),
      })
    : undefined;
  const payload = buildGhlPayload(body.lead, body.result, {
    submittedAt,
    clinicLocation: body.clinicLocation,
    imageProcessingConsent: true,
    imageProcessingConsentAt: body.imageProcessingConsentAt,
    metaTrackingConsent: metaTrackingAllowed,
    meta,
  });

  let webhook: string | undefined;
  try {
    webhook = serverEnv().GHL_WEBHOOK_URL;
  } catch {
    webhook = undefined;
  }

  const deliveryPromise = webhook
    ? deliverWebhook(webhook, payload)
    : Promise.resolve<DeliveryResult>({ delivered: false, attempts: 0 });
  const routingPromise = ensureLeadRoutingInGhl({
    lead: body.lead,
    source: `Under-Eye Analyzer · ${payload.clinicLocationLabel}`,
    tags: payload.tags,
  });
  const [delivery, routing] = await Promise.all([
    deliveryPromise,
    routingPromise,
  ]);

  const trackingQueued = Boolean(meta && delivery.delivered);
  const log = {
    event: "ghl_lead_delivery",
    delivered: delivery.delivered,
    attempts: delivery.attempts,
    trackingQueued,
    routingEnsured: routing.ok && routing.tagged === true,
    webhookConfigured: Boolean(webhook),
    leadTreatment: payload.leadTreatment,
  };
  if (delivery.delivered) console.info("[lead]", log);
  else console.warn("[lead]", log);

  return Response.json({
    ok: true,
    delivered: delivery.delivered,
    trackingQueued,
    routingEnsured: routing.ok && routing.tagged === true,
  });
}
