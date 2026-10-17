import { API_BASE, getKey, decodeOp, errorResponse } from "@/lib/gemini";
import { isAllowed, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

// -> { id, status: "in_progress" | "completed" | "failed", progress, error? }
export async function GET(req, { params }) {
  try {
    if (!(await isAllowed(req))) return unauthorized();
    const { id } = await params;
    const res = await fetch(`${API_BASE}/${decodeOp(id)}`, { headers: { "x-goog-api-key": getKey() } });
    const op = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json({ error: op?.error?.message || `Status check failed (${res.status})` }, { status: res.status });
    }

    if (!op.done) return Response.json({ id, status: "in_progress", progress: 0 });
    if (op.error) return Response.json({ id, status: "failed", error: op.error.message });

    const resp = op.response?.generateVideoResponse;
    if (!resp?.generatedSamples?.[0]?.video?.uri) {
      // Usually a safety filter on the prompt.
      return Response.json({
        id,
        status: "failed",
        error: resp?.raiMediaFilteredReasons?.[0] || "No video was returned. Try a different prompt.",
      });
    }
    return Response.json({ id, status: "completed", progress: 100 });
  } catch (error) {
    return errorResponse(error);
  }
}
