import type { ClinicLocationKey } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Where a lead's JSON payload is POSTed. Each clinic's own CRM inbound webhook
// once it is configured (CRM_WEBHOOK_URL_LONDON / CRM_WEBHOOK_URL_GLASGOW),
// otherwise the GoHighLevel inbound webhook exactly as before.
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadWebhookEnv {
  GHL_WEBHOOK_URL?: string;
  CRM_WEBHOOK_URL_LONDON?: string;
  CRM_WEBHOOK_URL_GLASGOW?: string;
}

export interface LeadWebhookTarget {
  url: string;
  destination: "crm" | "ghl";
}

export function leadWebhookTarget(
  clinicLocation: ClinicLocationKey,
  env: LeadWebhookEnv,
): LeadWebhookTarget | undefined {
  const crm =
    clinicLocation === "glasgow"
      ? env.CRM_WEBHOOK_URL_GLASGOW
      : env.CRM_WEBHOOK_URL_LONDON;
  if (crm) return { url: crm, destination: "crm" };
  if (env.GHL_WEBHOOK_URL) return { url: env.GHL_WEBHOOK_URL, destination: "ghl" };
  return undefined;
}
