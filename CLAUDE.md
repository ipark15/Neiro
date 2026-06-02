# Neiro — Voice Diary App

## What this app is

Neiro is a mobile voice diary app for language learners. Record voice entries, get them auto-transcribed, browse them on a calendar. Practice speaking with an AI conversation partner.

---

## Current status (V2 — AI partner built, pending deploy)

V1 shipped as Safari PWA. V2 AI conversation partner is built locally, pending Railway redeploy and frontend rebuild.

### What's done
- Landing screen (orbital animation, language grid, CTAs)
- Auth screens (sign in / create account, Supabase email auth, session persistence)
- Record screen (live waveform, recording, language selector, timer, uploads to backend)
- Calendar screen ("The Ledger" — stats row, month grid with language dots, entry card, audio player)
- FastAPI backend (Groq Whisper transcription, Supabase Storage upload, entries CRUD)
- Railway deployment (backend live)
- Web build via `npx expo export` (static output, accessed as Safari PWA)
- **Partner tab** — AI conversation partner (record voice → Whisper transcribe → Claude Haiku → ElevenLabs TTS → plays back)
- **Persona config system** — abstracted for Pass 2 persona picker UI

### Known tech debt
- expo-av → expo-audio migration (deprecated in SDK 54, not blocking)

---

## Tech stack

### Frontend
- Expo SDK 54, React Native, TypeScript
- Expo Router (file-based navigation, static web export)
- `expo-av` for recording and playback
- `axios` for API calls
- `@supabase/supabase-js` for auth
- `ws` npm package — required for Supabase realtime in Node.js 20 (static export)

### Backend
- Python 3.11, FastAPI, Uvicorn/Gunicorn
- Groq API (`whisper-large-v3`) for transcription — free tier
- Anthropic API (`claude-haiku-4-5-20251001`) for conversation responses
- ElevenLabs API (`eleven_multilingual_v2`) for text-to-speech
- `supabase-py` for DB and storage
- Deployed on Railway

### Infrastructure
- Supabase: PostgreSQL DB, Storage bucket `audio-entries`, Auth
- Project ref: `oawsvakrhhrbrxektpwz`

---

## Languages supported

EN, KO, JA, ES, FR, PT, DE — in that order throughout the UI.

---

## Running locally

### Frontend
```bash
npx expo start
```

### Backend
```bash
cd backend && source venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

Use `python -m uvicorn` not bare `uvicorn` — avoids subprocess using system Python instead of venv.

---

## Environment variables

### Frontend (`/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://oawsvakrhhrbrxektpwz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=<railway-url>
```

### Backend (`/backend/.env`)
```
GROQ_API_KEY=...
SUPABASE_URL=https://oawsvakrhhrbrxektpwz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
```

---

## AI Partner feature (V2)

### Architecture
- `POST /chat/message` — receives audio + language + conversation history (JSON), returns `{user_message, ai_text, ai_audio_base64}`
- Chat audio is ephemeral — not stored in Supabase. Returned as base64 inline.
- Conversation history is stateless — frontend holds the array and sends it each turn. No new DB table.
- `backend/config/personas.py` — persona config dict (system prompt template + ElevenLabs voice ID). Pass 2 will expose this in UI.
- `backend/services/claude_service.py` — Claude Haiku, max 256 tokens (short conversational replies)
- `backend/services/elevenlabs.py` — `eleven_multilingual_v2` model, works for all 7 supported languages with one voice

### Current persona
One default persona ("friend") — warm, casual, informal. Voice: ElevenLabs Rachel (`21m00Tcm4TlvDq8ikWAM`).

### Pass 2 — persona picker (not yet built)
Add entries to `backend/config/personas.py`. Each needs: `name`, `voice_id`, `system_prompt_template`. The frontend `chat.tsx` will expose a selector. Planned personas: friend, grandparent, store clerk, classmate, younger person. These map to distinct formality registers in Japanese/Korean.

---

## Key decisions

- **Groq over OpenAI Whisper** — free tier, same model (`whisper-large-v3`), faster. Switch to OpenAI at scale.
- **No calendar library** — built from scratch, full style control, only needed month view.
- **expo-av** — deprecated in SDK 54 but still functional. Migrate to `expo-audio` in next pass.
- **Email auth only** — no Google/Apple OAuth in V1, can be added later via Supabase.
- **Web-first PWA** — shipping as Safari PWA instead of native app store build for faster iteration.
- **Claude Haiku for chat** — fast enough for real-time conversation, cheap. Upgrade to Sonnet if language quality needs improvement.
- **Stateless chat backend** — history passed from frontend each turn, no DB table for chat sessions.
- **`ws` npm package** — Supabase realtime throws in Node.js 20 (no native WebSocket). Fixed by passing `ws` as transport when `typeof WebSocket === 'undefined'` (build time only).

---

## V2 remaining features

1. **Persona picker UI** — expose `personas.py` config in the Partner tab. Low effort, high user value.
2. **Push notifications** — daily reminder in target language. Low effort, directly boosts return rate.
3. **Pronunciation feedback** — Azure Cognitive Services Speech. High effort, post-traction.
4. **expo-av → expo-audio migration** — tech debt, do before SDK bump forces it.
