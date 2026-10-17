# Gen-Z AI

A ChatGPT-style assistant built with **Next.js** (frontend + API routes in one app) and **Google Gemini**.

## Features

- **Streaming chat** with Google Search grounding for live/current questions (sources are shown under the reply)
- **/image** image generation and editing (Gemini image model)
- **/video** video generation with aspect ratio (16:9 / 9:16) and length (Veo), with an animated placeholder while it renders
- **Voice**: speak a question and hear the answer (browser speech recognition + Gemini TTS)
- **Code answers** in colourful code cards with **Copy** and **Run** (HTML, JavaScript, Python run in a sandboxed side browser)
- Links in answers open in the same side browser
- **Copy** any message and **Reply** (quote) to any message
- Multiple chats with search, saved in the browser
- **Light / dark** theme toggle
- Optional **accounts** (signup/login). Set `REQUIRE_LOGIN=true` to lock image, video and the train assistant behind login
- **Train ticket assistant**: plan a Tatkal booking (details, countdown, checklist, AI train suggestions). It does *not* log in to IRCTC or book for you

## Getting started

```bash
npm install
cp .env.example .env.local   # then add your GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000. Get a key at https://aistudio.google.com/apikey.

Image, video and TTS models may need an API key with billing enabled; text chat works on the free tier.

## Environment variables

| Name | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Required. Gemini API key |
| `GEMINI_CHAT_MODEL`, `GEMINI_IMAGE_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_VIDEO_MODEL` | Optional model overrides |
| `REQUIRE_LOGIN` | `true` to require an account for image, video and train features |
| `AUTH_SECRET` | Optional secret for signing session cookies (generated into `data/` if unset) |

## Notes

- Accounts are stored in `data/users.json` (passwords hashed with scrypt). That is fine for local use; use a real database before deploying.
- Never commit `.env.local` or `data/`; both are git-ignored.
