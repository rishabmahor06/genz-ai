import { getAI, MODELS, errorResponse, readableMessage } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const systemPrompt = () =>
  `Today is ${new Date().toLocaleDateString("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" })} (India time). ` +
  "You are Gen-Z AI, a helpful, friendly assistant. " +
  "Whenever you give code, put it in a fenced markdown block with the language tag (```html, ```javascript, ```python, ...). " +
  "For web UI/demo requests, give ONE self-contained HTML file (inline CSS and JS, no external build step) so it can be run directly in a browser preview. " +
  "For anything current or live (news, weather, prices, scores, recent events), use Google Search and answer from the results. " +
  "Keep explanations outside the code block short.";

// body: { item: string, history?: [{ from: "user" | "assistant", text: string }] }
//
// Streams newline-delimited JSON so the UI can type the answer as it is generated:
//   {"text":"partial text"}  ...repeated...
//   {"sources":[{title,url}]}   (only if Google Search was used)
//   {"error":"message"}         (only if the stream fails half-way)
export async function POST(req) {
  try {
    const { item, history = [] } = await req.json();
    if (!item?.trim()) {
      return Response.json({ message: "item field is required" }, { status: 400 });
    }

    const contents = [
      ...history
        .filter((m) => m?.text)
        .slice(-20)
        .map((m) => ({ role: m.from === "user" ? "user" : "model", parts: [{ text: m.text }] })),
      { role: "user", parts: [{ text: item }] },
    ];

    const stream = await getAI().models.generateContentStream({
      model: MODELS.text,
      contents,
      config: { systemInstruction: systemPrompt(), tools: [{ googleSearch: {} }] },
    });

    // Wait for the first chunk so request errors (quota, bad key...) still come back as a normal JSON error.
    const iterator = stream[Symbol.asyncIterator]();
    let step = await iterator.next();

    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        const sources = new Map();
        try {
          while (!step.done) {
            const chunk = step.value;
            if (chunk.text) send({ text: chunk.text });
            for (const c of chunk.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) {
              if (c.web?.uri) sources.set(c.web.uri, { title: c.web.title || c.web.uri, url: c.web.uri });
            }
            step = await iterator.next();
          }
          if (sources.size) send({ sources: [...sources.values()] });
        } catch (error) {
          console.error("Gemini stream error:", error);
          try {
            send({ error: readableMessage(error) });
          } catch {}
        } finally {
          try {
            controller.close();
          } catch {}
        }
      },
      cancel() {
        iterator.return?.();
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
