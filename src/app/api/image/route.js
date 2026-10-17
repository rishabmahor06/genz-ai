import { getAI, MODELS, errorResponse } from "@/lib/gemini";
import { isAllowed, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const EDIT_INTENT = /\b(edit|change|make|turn|convert|add|remove|replace|recolou?r|restyle|transform|redraw|cartoon|anime|background|generate|create)\b/i;

// body: { item: string, fileImage?: data URI, mode?: "image" }
// - /image mode (or no picture)   -> image model generates / edits
// - picture + edit-style prompt   -> image model edits
// - picture + question            -> text model describes / answers (vision)
// Returns { message, image } where image is a data URI (or null).
export async function POST(req) {
  try {
    if (!(await isAllowed(req))) return unauthorized();
    const { item, fileImage, mode } = await req.json();
    const prompt = item?.trim();
    if (!prompt && !fileImage) {
      return Response.json({ error: "item or fileImage is required" }, { status: 400 });
    }

    const parts = [{ text: prompt || "Describe this image in detail." }];
    const match = typeof fileImage === "string" && fileImage.match(/^data:(.+?);base64,(.*)$/);
    if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });

    const wantsImage = mode === "image" || !match || (prompt && EDIT_INTENT.test(prompt));
    const response = await getAI().models.generateContent({
      model: wantsImage ? MODELS.image : MODELS.text,
      contents: [{ role: "user", parts }],
    });

    let text = "";
    let image = null;
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.text) text += part.text + "\n";
      if (part.inlineData?.data && !image) {
        image = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
      }
    }

    if (wantsImage && !image) {
      return Response.json(
        { success: false, error: text.trim() || "The model did not return an image. Try rephrasing the prompt." },
        { status: 422 }
      );
    }
    return Response.json({ success: true, message: text.trim(), image });
  } catch (error) {
    return errorResponse(error);
  }
}
