import { API_BASE, MODELS, getKey, encodeOp, errorResponse } from "@/lib/gemini";
import { isAllowed, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

const RATIOS = ["16:9", "9:16"];
const DURATIONS = [4, 6, 8]; // Veo 3.x clip lengths

// body: { prompt, ratio: "16:9" | "9:16", seconds?: 4 | 6 | 8 } -> { id, status }
// Generation takes minutes, so we only start the Veo job here; the client polls /api/video/[id].
export async function POST(req) {
  try {
    if (!(await isAllowed(req))) return unauthorized();
    const { prompt, ratio = "16:9", seconds = 4 } = await req.json();
    if (!prompt?.trim()) return Response.json({ error: "prompt is required" }, { status: 400 });
    if (!RATIOS.includes(ratio)) {
      return Response.json({ error: `ratio must be one of ${RATIOS.join(", ")}` }, { status: 400 });
    }
    const durationSeconds = DURATIONS.includes(Number(seconds)) ? Number(seconds) : 4;

    const res = await fetch(`${API_BASE}/models/${MODELS.video}:predictLongRunning`, {
      method: "POST",
      headers: { "x-goog-api-key": getKey(), "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: prompt.trim() }],
        parameters: { aspectRatio: ratio, durationSeconds },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.name) {
      const error =
        res.status === 429
          ? "Gemini quota exceeded. Video (Veo) needs an API key with billing enabled (https://aistudio.google.com/apikey)."
          : data?.error?.message || `Video request failed (${res.status})`;
      return Response.json({ error }, { status: res.status || 500 });
    }
    return Response.json({ id: encodeOp(data.name), status: "generating" });
  } catch (error) {
    return errorResponse(error);
  }
}
