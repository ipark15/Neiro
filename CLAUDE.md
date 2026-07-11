# Neiro — Voice Diary App

## What this app is

Neiro is a voice diary app for language learners. Record voice entries, get them auto-transcribed, browse them on a calendar. Practice speaking with an AI conversation partner. Ships as an Expo web app (deployed on Vercel) with the same codebase targeting iOS/Android later.

---

## Current status (V2 — AI partner built, pending deploy)

All core screens and backend are built. End-to-end flow works: record → transcribe → save → view on calendar.

### What's done
- Landing screen (orbital animation, language grid, CTAs)
- Auth screens (sign in / create account, Supabase email auth, session persistence — AsyncStorage on native, localStorage on web)
- Record screen (live waveform, expo-audio recording on native / MediaRecorder + AnalyserNode on web, language selector, timer, uploads to backend)
- Calendar screen ("The Ledger" — stats row, month grid with language dots, entry card, audio player)
- Entry detail screen (full transcript with edit, audio player)
- FastAPI backend (Groq Whisper transcription with user-selected language hint, Supabase Storage upload, entries CRUD)
- API auth: every backend route requires a Supabase JWT (`Authorization: Bearer`) and scopes queries to the token's user — the client never sends `user_id`
- expo-av → expo-audio migration (done; expo-av removed)
- **Partner tab** — AI conversation partner (record voice → Whisper transcribe → Claude Haiku → ElevenLabs TTS → plays back)
- **Persona config system** — abstracted for Pass 2 persona picker UI

### What's pending
- Backend hosting (migrating from Railway to Render)
- Multiple entries per day: the DB allows them but the calendar shows only the latest per day (needs a product decision)

---

## Tech stack

### Frontend (web + mobile)
- Expo SDK 54, React Native, TypeScript
- Expo Router (file-based navigation), static web output, deployed to Vercel
- `expo-audio` for recording/playback on native; MediaRecorder + HTML Audio on web (platform-split via `.web.tsx` files and `Platform.OS` checks)
- `axios` for API calls (JWT attached via request interceptor)
- `@supabase/supabase-js` for auth
- `ws` npm package — required for Supabase realtime in Node.js 20 (static export); stubbed via `metro.config.js` during dev/native builds

### Backend
- Python 3.11, FastAPI, Uvicorn/Gunicorn
- Groq API (`whisper-large-v3`) for transcription — free tier
- Anthropic API (`claude-haiku-4-5-20251001`) for conversation responses
- ElevenLabs API (`eleven_multilingual_v2`) for text-to-speech
- `supabase-py` for DB and storage
- Deploy target: Render (migrating from Railway)

### Infrastructure
- Supabase: PostgreSQL DB, Storage bucket `audio-entries`, Auth
- Project ref: `oawsvakrhhrbrxektpwz`

---

## Languages supported

EN, KO, JA, ES, FR, PT, DE — in that order throughout the UI. The user's selection is sent with each upload and used as the Whisper language hint; it wins over auto-detection.

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

## Deployment

### Web (Vercel — live)
- Expo static output (`app.json` → `web.output: "static"`); `vercel.json` rewrites everything to `/index.html` for client-side routing
- `EXPO_PUBLIC_API_URL` must be set at build time and must be **https** — the Vercel site is served over HTTPS, so an `http://` backend is blocked as mixed content

### Backend (Render)
1. render.com → New → Web Service → connect GitHub → select Neiro
2. Set root directory to `backend`, build command `pip install -r requirements.txt`
3. Start command: `gunicorn main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120`
4. Add env vars: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`
5. After deploy, update `EXPO_PUBLIC_API_URL` in frontend `.env` / Vercel env with the Render URL

---

## Environment variables

### Frontend (`/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://oawsvakrhhrbrxektpwz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=<render-url>   ← http://<your-mac-ip>:8000 for local dev
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
- **expo-audio** — migrated from deprecated expo-av. Note the AudioMode keys are `playsInSilentMode` / `allowsRecording` (no `IOS` suffix — the old expo-av names are silently ignored).
- **JWT-verified API** — the backend uses the service-role key (bypasses RLS), so every route derives the user from the Supabase JWT and scopes queries to it.
- **Email auth only** — no Google/Apple OAuth in V1, can be added later via Supabase.
- **Web-first PWA** — shipping as Safari PWA instead of native app store build for faster iteration.
- **Claude Haiku for chat** — fast enough for real-time conversation, cheap. Upgrade to Sonnet if language quality needs improvement.
- **Stateless chat backend** — history passed from frontend each turn, no DB table for chat sessions.
- **`ws` + metro.config.js** — Supabase realtime throws in Node.js 20 (no native WebSocket). `metro.config.js` stubs `ws` to empty for Metro builds; the `ws` package is still in `package.json` for any Node.js-only code paths.

---

## V2 remaining features

1. **Persona picker UI** — expose `personas.py` config in the Partner tab. Low effort, high user value.
2. **Push notifications** — daily reminder in target language. Low effort, directly boosts return rate.
3. **Pronunciation feedback** — Azure Cognitive Services Speech. High effort, post-traction.
