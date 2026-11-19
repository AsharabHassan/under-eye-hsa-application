import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Server-only environment access. Validated lazily so the bundle never leaks
// secrets to the client and missing config fails fast at request time, with a
// clear message, rather than as a cryptic SDK error.
// ─────────────────────────────────────────────────────────────────────────────

/** A clinic's CRM inbound lead webhook: optional, blank = not set, https only. */
const crmWebhookUrl = (name: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .url(`${name} must be a valid URL`)
      .refine((v) => v.startsWith("https://"), `${name} must use https`)
      .optional(),
  );

const serverSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
  GHL_WEBHOOK_URL: z
    .string()
    .url("GHL_WEBHOOK_URL must be a valid URL")
    .optional(),
  // Each clinic's own CRM webhook. When the lead's clinic has one, the lead
  // goes there instead of GHL_WEBHOOK_URL (lib/lead-webhook.ts).
  CRM_WEBHOOK_URL_LONDON: crmWebhookUrl("CRM_WEBHOOK_URL_LONDON"),
  CRM_WEBHOOK_URL_GLASGOW: crmWebhookUrl("CRM_WEBHOOK_URL_GLASGOW"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/** Validate and return server env. Throws if required vars are missing. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
