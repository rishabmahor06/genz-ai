import { API_BASE, getKey, decodeOp, errorResponse } from "@/lib/gemini";
import { isAllowed, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

// Streams the finished mp4 so the browser can use <video src="/api/video/ID/content">.
// The API key never reaches the browser: we look up the file URI and proxy it.
export async function GET(req, { params }) {
  try {
    if (!(await isAllowed(req))) return unauthorized();
    const { id } = await params;
    const headers = { "x-goog-api-key": getKey() };

    const opRes = await fetch(`${API_BASE}/${decodeOp(id)}`, { headers });
    const op = await opRes.json().catch(() => ({}));
    const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    if (!uri) return Response.json({ error: "Video is not ready" }, { status: 404 });

    const upstream = await fetch(uri, { headers });
    if (!upstream.ok || !upstream.body) {
      return Response.json({ error: `Download failed (${upstream.status})` }, { status: upstream.status || 502 });
    }
    return new Response(upstream.body, {
      headers: { "Content-Type": "video/mp4", "Cache-Control": "private, max-age=3600" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
