import { getAI, MODELS, errorResponse } from "@/lib/gemini";
import { isAllowed, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Planning helper only: suggests trains/timings for a route using Google Search.
// It does NOT log in to IRCTC or book anything.
// body: { from, to, date, cls, quota } -> { message, sources }
export async function POST(req) {
  try {
    if (!(await isAllowed(req))) return unauthorized();

    const { from, to, date, cls, quota } = await req.json();
    if (!from?.trim() || !to?.trim()) {
      return Response.json({ error: "Please enter both From and To stations." }, { status: 400 });
    }

    const prompt =
      `Help me plan an Indian Railways trip.\nFrom: ${from}\nTo: ${to}\nDate: ${date || "not decided"}\nClass: ${cls || "any"}\nQuota: ${quota || "Tatkal"}\n\n` +
      "List the main trains on this route (train number, name, departure -> arrival, duration, running days) as a markdown table, " +
      "best options first. Then add 3 short bullet tips for booking this route under that quota. " +
      "You cannot see live seat availability or fares, so say so and tell me to confirm them on the official IRCTC site/app.";

    const response = await getAI().models.generateContent({
      model: MODELS.text,
      contents: prompt,
      config: {
        systemInstruction: "You are a careful Indian Railways travel planner. Be accurate; if unsure about a train, say so.",
        tools: [{ googleSearch: {} }],
      },
    });

    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web)
      .filter((w) => w?.uri)
      .map((w) => ({ title: w.title || w.uri, url: w.uri }));

    return Response.json({ message: response.text ?? "", sources });
  } catch (error) {
    return errorResponse(error);
  }
}
