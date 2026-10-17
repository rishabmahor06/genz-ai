import { GoogleGenAI } from "@google/genai";

export const MODELS = {
  text: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
  image: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
  tts: process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts",
  video: process.env.GEMINI_VIDEO_MODEL || "veo-3.1-fast-generate-preview",
};

export const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function getKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing. Add it to .env.local and restart the server.");
  return key;
}

let client;
export function getAI() {
  client ??= new GoogleGenAI({ apiKey: getKey() });
  return client;
}

// Gemini TTS returns raw 16-bit PCM @ 24kHz mono; wrap it in a WAV header so browsers can play it.
export function pcmToWav(pcm, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * channels * bitDepth) / 8, 28);
  header.writeUInt16LE((channels * bitDepth) / 8, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// Operation names look like "models/veo-.../operations/abc"; make them URL-safe.
export const encodeOp = (name) => Buffer.from(name).toString("base64url");
export const decodeOp = (id) => Buffer.from(id, "base64url").toString();

// SDK errors carry the API's JSON body as the message; pull out the readable part.
export function readableMessage(error) {
  const raw = error?.message || "Internal server error";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || raw;
  } catch {
    return raw;
  }
}

export function errorResponse(error) {
  console.error("Gemini API error:", error);
  const status = error?.status >= 400 && error?.status < 600 ? error.status : 500;
  let message = readableMessage(error);
  if (status === 429) {
    message =
      "Gemini quota exceeded for this model. Image and video generation need an API key with billing enabled (https://aistudio.google.com/apikey); on the free tier, text chat still works.";
  }
  return Response.json({ success: false, error: message }, { status });
}
