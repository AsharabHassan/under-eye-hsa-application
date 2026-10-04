import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// HSA SkinScan — the clinic's own skin service (pigmentation-model/serve.py),
// `/undereye` endpoint. It MEASURES each under-eye band against the person's own
// cheek: how much darker it is beyond normal under-eye shading, and the colour of
// that darkness (pigmented = brown, vascular = blue/purple, structural = a
// colourless shadow, i.e. hollowing). Passed to Claude as a supporting signal.
// Optional: with SKINSCAN_URL unset, or on any error/timeout, the analysis runs on
// Claude alone. The image goes only to the clinic's own service, never stored.
// ─────────────────────────────────────────────────────────────────────────────

export interface UnderEyeSide {
  darkness: number;
  beyond_normal: number;
  redder: number;
  browner: number;
  character: "minimal" | "pigmented" | "vascular" | "structural";
}

export interface UnderEyeReading {
  darkness_index: number;
  character: UnderEyeSide["character"];
  sides: Record<string, UnderEyeSide>;
  version?: string;
}

const TIMEOUT_MS = 8_000;

export async function skinScanUnderEye(imageBase64: string): Promise<UnderEyeReading | null> {
  const url = process.env.SKINSCAN_URL;
  if (!url) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/undereye`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SKINSCAN_API_KEY ? { "x-skinscan-key": process.env.SKINSCAN_API_KEY } : {}),
      },
      body: JSON.stringify({ image_base64: imageBase64 }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as UnderEyeReading & { ok?: boolean };
    return data.ok ? data : null;
  } catch (err) {
    console.error("[skinscan] unavailable — continuing with Claude alone:", err instanceof Error ? err.name : err);
    return null;
  }
}

const CHARACTER_HINT: Record<UnderEyeSide["character"], string> = {
  minimal: "within normal under-eye shading",
  pigmented: "browner than the cheek — consistent with pigmented dark circles",
  vascular: "bluer/more purple than the cheek — consistent with thin skin showing vessels beneath",
  structural: "darker without a colour shift — consistent with a shadow from hollowing",
};

/** The reading as a short note for Claude's user turn. */
export function underEyeNote(r: UnderEyeReading): string {
  const sides = Object.entries(r.sides)
    .map(([side, s]) => `${side}: ${s.beyond_normal >= 0 ? "+" : ""}${s.beyond_normal} L* beyond normal, ${CHARACTER_HINT[s.character]}`)
    .join("; ");
  return (
    "HSA SkinScan measurement of the under-eye area (the clinic's own colour measurement vs the person's cheek — a supporting signal; " +
    "trust what you clearly see in the photo when they disagree, and remember it cannot see puffiness, lines or crow's feet): " +
    `darkness index ${r.darkness_index}/100, overall character "${r.character}" (${CHARACTER_HINT[r.character]}). Per side — ${sides}.`
  );
}
