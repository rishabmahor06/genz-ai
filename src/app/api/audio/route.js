import { getAI, MODELS, pcmToWav, errorResponse } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

// body: { audioText: string } -> { message, audio } (audio is a base64 WAV data URI)
export async function POST(req) {
  try {
    const { audioText } = await req.json();
    if (!audioText?.trim()) {
      return Response.json({ error: "audioText is required" }, { status: 400 });
    }
    const ai = getAI();

    const reply = await ai.models.generateContent({
      model: MODELS.text,
      contents: audioText,
      config: {
        systemInstruction:
          "You are an AI voice assistant. Respond in a short, clear, natural, conversational way. Avoid long explanations unless asked. Plain text only, no markdown.",
      },
    });
    const message = reply.text ?? "";
    if (!message) return Response.json({ message, audio: null });

    const tts = await ai.models.generateContent({
      model: MODELS.tts,
      contents: [{ parts: [{ text: `Say the following in a natural, friendly voice: ${message}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Algieba" } } },
      },
    });

    const data = tts.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) return Response.json({ message, audio: null });

    const wav = pcmToWav(Buffer.from(data, "base64"));
    return Response.json({ message, audio: `data:audio/wav;base64,${wav.toString("base64")}` });
  } catch (error) {
    return errorResponse(error);
  }
}
