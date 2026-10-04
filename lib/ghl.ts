import { randomUUID } from "node:crypto";
import type {
  AnalyzeResult,
  ClientMetaAttribution,
  Lead,
  ServerMetaConversion,
  ClinicLocationKey,
} from "./types";
import { BUCKET_META, SITE_URL, TREATMENTS, getClinicLocation } from "./constants";
import { ANALYSIS_PRIVACY_NOTICE_VERSION } from "./privacy";

/** Meta dataset / pixel id for server-side conversions. Empty = disabled. */
export const META_DATASET_ID = (process.env.META_DATASET_ID ?? "").trim();
export const META_EVENT_NAME = "Lead" as const;
export const PRODUCTION_ORIGIN = new URL(SITE_URL).origin;

export interface GhlPayload {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  clinicLocation: ClinicLocationKey;
  clinicLocationLabel: string;
  clinicAddress: string;
  suitabilityBucket: string;
  suitabilityLabel: string;
  suitabilityScore: number;
  hardFlags: string[];
  observedAreas: string[];
  usedPhoto: boolean;
  narrativeSource: string;
  headline: string;
  /** The matched HSA treatment — what the clinic should pitch. */
  leadTreatment: string;
  leadTreatmentLabel: string;
  leadTreatmentPrice: string;
  secondaryTreatment: string;
  secondaryTreatmentLabel: string;
  treatmentReason: string;
  /** Per-concern visibility as "key:percent" pairs for CRM filtering. */
  concernSeverity: string;
  imageProcessingConsent: boolean;
  imageProcessingConsentAt?: string;
  imageProcessingConsentRecordedAt?: string;
  privacyNoticeVersion: string;
  metaTrackingConsent: boolean;
  submittedAt?: string;
  // Flat, allow-listed fields for the conditional GHL -> Meta CAPI action.
  metaDatasetId?: string;
  metaPixelId?: string;
  metaEventName?: string;
  metaEventId?: string;
  metaEventTime?: number;
  metaActionSource?: string;
  metaEventSourceUrl?: string;
  metaFbp?: string;
  metaFbc?: string;
  metaFbclid?: string;
  metaFirstName?: string;
  metaLastName?: string;
  metaEmail?: string;
  metaPhone?: string;
  metaClientUserAgent?: string;
  metaClientIpAddress?: string;
}

export interface BuildGhlPayloadOptions {
  submittedAt?: string;
  clinicLocation: ClinicLocationKey;
  imageProcessingConsent: boolean;
  imageProcessingConsentAt?: string;
  privacyNoticeVersion?: string;
  metaTrackingConsent: boolean;
  meta?: ServerMetaConversion;
}

/** Force an untrusted browser URL onto the production origin and drop query/hash. */
export function canonicalEventSourceUrl(raw?: string | null): string {
  let pathname = "/";
  if (raw) {
    try {
      pathname = new URL(raw, PRODUCTION_ORIGIN).pathname || "/";
    } catch {
      pathname = "/";
    }
  }

  const canonical = new URL(PRODUCTION_ORIGIN);
  canonical.pathname = pathname.replace(/\/{2,}/g, "/");
  canonical.search = "";
  canonical.hash = "";
  return canonical.toString();
}

function optionalValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Extract the raw click id from Meta's `_fbc` cookie format.
 *
 * The browser never submits a standalone fbclid. Keeping this extraction on
 * the server prevents callers from supplying a separate, mismatched value.
 */
export function fbclidFromFbc(fbc: string | null | undefined): string | undefined {
  const value = optionalValue(fbc);
  if (!value) return undefined;

  const match = /^fb\.\d{1,3}\.\d{13}\.([A-Za-z0-9_-]{1,220})$/.exec(value);
  return match?.[1];
}

/** Create the server-controlled Meta event after consent has been validated. */
export function createServerMetaConversion(options: {
  lead: Lead;
  attribution?: ClientMetaAttribution;
  clientUserAgent?: string | null;
  clientIpAddress?: string | null;
  eventId?: string;
  eventTime?: number;
}): ServerMetaConversion {
  const fbc = optionalValue(options.attribution?.fbc);
  const fbclid = fbclidFromFbc(fbc);

  return {
    datasetId: META_DATASET_ID,
    pixelId: META_DATASET_ID,
    eventName: META_EVENT_NAME,
    eventId: options.eventId ?? randomUUID(),
    eventTime: options.eventTime ?? Math.floor(Date.now() / 1000),
    actionSource: "website",
    eventSourceUrl: canonicalEventSourceUrl(
      options.attribution?.eventSourceUrl,
    ),
    fbp: optionalValue(options.attribution?.fbp),
    fbc,
    ...(fbclid ? { fbclid } : {}),
    firstName: options.lead.firstName,
    lastName: options.lead.lastName,
    email: options.lead.email,
    phone: options.lead.phone,
    clientUserAgent: optionalValue(options.clientUserAgent),
    clientIpAddress: optionalValue(options.clientIpAddress),
  };
}

/** The base tags every HSA under-eye lead carries. */
export function baseTags(clinicKey: ClinicLocationKey): string[] {
  return [
    "undereye-analyzer",
    "hsa-undereye-lead",
    "hsa-source-undereye-app",
    `hsa-clinic-${clinicKey}`,
  ];
}

/** Build the GoHighLevel inbound-webhook body. This helper performs no I/O. */
export function buildGhlPayload(
  lead: Lead,
  result: AnalyzeResult,
  options: BuildGhlPayloadOptions,
): GhlPayload {
  const clinic = getClinicLocation(options.clinicLocation);
  const meta = options.metaTrackingConsent ? options.meta : undefined;
  const metaFields: Partial<GhlPayload> = meta
    ? {
        metaDatasetId: meta.datasetId,
        metaPixelId: meta.pixelId,
        metaEventName: meta.eventName,
        metaEventId: meta.eventId,
        metaEventTime: meta.eventTime,
        metaActionSource: meta.actionSource,
        metaEventSourceUrl: meta.eventSourceUrl,
        metaFbp: meta.fbp,
        metaFbc: meta.fbc,
        ...(meta.fbclid ? { metaFbclid: meta.fbclid } : {}),
        metaFirstName: meta.firstName,
        metaLastName: meta.lastName,
        metaEmail: meta.email,
        metaPhone: meta.phone,
        metaClientUserAgent: meta.clientUserAgent,
        metaClientIpAddress: meta.clientIpAddress,
      }
    : {};

  const leadTreatment = TREATMENTS[result.treatment.lead];
  const secondary = result.treatment.secondary
    ? TREATMENTS[result.treatment.secondary]
    : null;

  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
    phone: lead.phone,
    source: `Under-Eye Analyzer · ${clinic.city}`,
    tags: [
      ...baseTags(clinic.key),
      `undereye-${result.bucket}`,
      `undereye-plan-${leadTreatment.id}`,
      options.metaTrackingConsent
        ? "hsa-meta-consent-accepted"
        : "hsa-meta-consent-declined",
    ],
    clinicLocation: clinic.key,
    clinicLocationLabel: clinic.city,
    clinicAddress: clinic.lines.join(", "),
    suitabilityBucket: result.bucket,
    suitabilityLabel: BUCKET_META[result.bucket].label,
    suitabilityScore: result.score,
    hardFlags: result.hardFlags,
    observedAreas: result.narrative.observedAreas,
    usedPhoto: result.usedPhoto,
    narrativeSource: result.narrativeSource,
    headline: result.narrative.headline,
    leadTreatment: leadTreatment.id,
    leadTreatmentLabel: leadTreatment.ghlLabel,
    // An unpublished price (priceFrom 0) goes over as the neutral display text,
    // never as "£0".
    leadTreatmentPrice: leadTreatment.price[clinic.key],
    secondaryTreatment: secondary?.id ?? "",
    secondaryTreatmentLabel: secondary?.ghlLabel ?? "",
    treatmentReason: result.treatment.reason,
    concernSeverity: Object.entries(result.concernSeverity)
      .map(([k, v]) => `${k}:${v}`)
      .join(", "),
    imageProcessingConsent: options.imageProcessingConsent,
    imageProcessingConsentAt: options.imageProcessingConsent
      ? (options.imageProcessingConsentAt ?? options.submittedAt)
      : undefined,
    imageProcessingConsentRecordedAt: options.imageProcessingConsent
      ? options.submittedAt
      : undefined,
    privacyNoticeVersion:
      options.privacyNoticeVersion ?? ANALYSIS_PRIVACY_NOTICE_VERSION,
    metaTrackingConsent: options.metaTrackingConsent,
    submittedAt: options.submittedAt,
    ...metaFields,
  };
}
