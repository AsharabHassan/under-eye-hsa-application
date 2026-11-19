import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leadWebhookTarget } from "@/lib/lead-webhook";
import type { AnalyzeResult, Lead } from "@/lib/types";

vi.mock("@/lib/ghl-contact", () => ({
  ensureLeadRoutingInGhl: vi.fn(async () => ({ ok: true, tagged: true })),
}));

const GHL = "https://services.leadconnectorhq.com/hooks/ghl";
const LONDON = "https://app.crm.strategyguys.agency/api/webhooks/inbound/london";
const GLASGOW = "https://app.crm.strategyguys.agency/api/webhooks/inbound/glasgow";

describe("leadWebhookTarget", () => {
  it("sends each clinic's lead to its own CRM webhook when set", () => {
    const env = { GHL_WEBHOOK_URL: GHL, CRM_WEBHOOK_URL_LONDON: LONDON, CRM_WEBHOOK_URL_GLASGOW: GLASGOW };
    expect(leadWebhookTarget("london", env)).toEqual({ url: LONDON, destination: "crm" });
    expect(leadWebhookTarget("glasgow", env)).toEqual({ url: GLASGOW, destination: "crm" });
  });

  it("keeps GoHighLevel for a clinic without a CRM webhook", () => {
    const env = { GHL_WEBHOOK_URL: GHL, CRM_WEBHOOK_URL_LONDON: LONDON };
    expect(leadWebhookTarget("glasgow", env)).toEqual({ url: GHL, destination: "ghl" });
    expect(leadWebhookTarget("london", { GHL_WEBHOOK_URL: GHL })).toEqual({ url: GHL, destination: "ghl" });
  });

  it("returns nothing when no webhook is configured", () => {
    expect(leadWebhookTarget("london", {})).toBeUndefined();
  });
});

describe("serverEnv CRM webhooks", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("treats blank CRM webhook values as not set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("CRM_WEBHOOK_URL_LONDON", "");
    vi.stubEnv("CRM_WEBHOOK_URL_GLASGOW", " ");
    const { serverEnv } = await import("@/lib/env");
    expect(serverEnv().CRM_WEBHOOK_URL_LONDON).toBeUndefined();
    expect(serverEnv().CRM_WEBHOOK_URL_GLASGOW).toBeUndefined();
  });

  it("accepts https CRM webhooks", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("CRM_WEBHOOK_URL_LONDON", LONDON);
    vi.stubEnv("CRM_WEBHOOK_URL_GLASGOW", GLASGOW);
    const { serverEnv } = await import("@/lib/env");
    expect(serverEnv().CRM_WEBHOOK_URL_LONDON).toBe(LONDON);
    expect(serverEnv().CRM_WEBHOOK_URL_GLASGOW).toBe(GLASGOW);
  });

  it("rejects a malformed or plain-http CRM webhook", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("CRM_WEBHOOK_URL_GLASGOW", "not a url");
    let { serverEnv } = await import("@/lib/env");
    expect(() => serverEnv()).toThrow(/CRM_WEBHOOK_URL_GLASGOW/);
    vi.resetModules();
    vi.stubEnv("CRM_WEBHOOK_URL_GLASGOW", "http://example.com/hook");
    ({ serverEnv } = await import("@/lib/env"));
    expect(() => serverEnv()).toThrow(/must use https/);
  });
});

const lead: Lead = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "07700900123",
};

const result: AnalyzeResult = {
  bucket: "great",
  score: 88,
  hardFlags: [],
  softFlagged: false,
  routedReason: "ideal",
  usedPhoto: true,
  sidesObscured: [],
  makeupDetected: false,
  concernSeverity: { hollowing: 70 },
  concernImprovement: { hollowing: 65 },
  framingAdequate: true,
  narrativeSource: "claude",
  narrative: {
    headline: "h",
    narrative: "n",
    observedAreas: ["hollowing"],
    encouragement: "e",
  },
  treatment: { lead: "teartrough", secondary: null, reason: "r", source: "claude" },
};

describe("POST /api/lead delivery target", () => {
  const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("GHL_WEBHOOK_URL", GHL);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function post(clinicLocation: "london" | "glasgow") {
    const { POST } = await import("@/app/api/lead/route");
    const response = await POST(
      new Request("http://localhost/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lead,
          result,
          clinicLocation,
          imageProcessingConsent: true,
          imageProcessingConsentAt: "2026-11-20T09:00:00.000Z",
          metaTrackingConsent: false,
        }),
      }),
    );
    expect(response.status).toBe(200);
    return (await response.json()) as { delivered: boolean };
  }

  function postedUrls(): string[] {
    return fetchMock.mock.calls.map((call) => String((call as unknown[])[0]));
  }

  function postedPayload(): Record<string, unknown> {
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit;
    return JSON.parse(String(init.body));
  }

  it("posts a London lead to the London CRM webhook only", async () => {
    vi.stubEnv("CRM_WEBHOOK_URL_LONDON", LONDON);
    vi.stubEnv("CRM_WEBHOOK_URL_GLASGOW", GLASGOW);
    expect((await post("london")).delivered).toBe(true);
    expect(postedUrls()).toEqual([LONDON]);
    expect(postedPayload()).toMatchObject({ clinicLocation: "london", email: "jane@example.com" });
  });

  it("posts a Glasgow lead to the Glasgow CRM webhook only", async () => {
    vi.stubEnv("CRM_WEBHOOK_URL_LONDON", LONDON);
    vi.stubEnv("CRM_WEBHOOK_URL_GLASGOW", GLASGOW);
    await post("glasgow");
    expect(postedUrls()).toEqual([GLASGOW]);
    expect(postedPayload()).toMatchObject({ clinicLocation: "glasgow" });
  });

  it("keeps posting to GoHighLevel when the clinic has no CRM webhook", async () => {
    vi.stubEnv("CRM_WEBHOOK_URL_LONDON", LONDON);
    await post("glasgow");
    expect(postedUrls()).toEqual([GHL]);
  });

  it("sends the CRM exactly the payload GoHighLevel gets", async () => {
    await post("london");
    const ghlPayload = postedPayload();
    fetchMock.mockClear();
    vi.resetModules();
    vi.stubEnv("CRM_WEBHOOK_URL_LONDON", LONDON);
    await post("london");
    const crmPayload = postedPayload();
    const strip = (p: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(p).filter(([k]) => !/At$|_time$|Time$/.test(k)));
    expect(Object.keys(crmPayload).sort()).toEqual(Object.keys(ghlPayload).sort());
    expect(strip(crmPayload)).toEqual(strip(ghlPayload));
  });
});
