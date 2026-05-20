# Neiro — Voice Diary App

## What this app is

Neiro is a mobile voice diary app for language learners. Record voice entries, get them auto-transcribed, browse them on a calendar.

---

## Current status (V1 — feature complete, pending Railway deploy)

All core screens and backend are built and working locally. End-to-end flow works: record → transcribe → save → view on calendar.

### What's done
- Landing screen (orbital animation, language grid, CTAs)
- Auth screens (sign in / create account, Supabase email auth, session persistence)
- Record screen (live waveform, expo-av recording, language selector, timer, uploads to backend)
- Calendar screen ("The Ledger" — stats row, month grid with language dots, entry card, audio player)
- FastAPI backend (Groq Whisper transcription, Supabase Storage upload, entries CRUD)

### What's pending
- Railway deployment (backend runs locally for now — see below)
- expo-av → expo-audio migration (deprecated warning, not blocking)

---

## Tech stack

### Mobile
- Expo SDK 54, React Native, TypeScript
- Expo Router (file-based navigation)
- `expo-av` for recording and playback
- `axios` for API calls
- `@supabase/supabase-js` for auth

### Backend
- Python 3.11, FastAPI, Uvicorn/Gunicorn
- Groq API (`whisper-large-v3`) for transcription — free tier
- `supabase-py` for DB and storage
- Deployed target: Railway (pending)

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

## Railway deployment (pending)

1. railway.app → New Project → Deploy from GitHub → select Neiro
2. Set root directory to `backend`
3. Add env vars: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
4. After deploy, update `EXPO_PUBLIC_API_URL` in frontend `.env` with the Railway URL

---

## Environment variables

### Frontend (`/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://oawsvakrhhrbrxektpwz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=http://<your-mac-ip>:8000   ← update to Railway URL after deploy
```

### Backend (`/backend/.env`)
```
GROQ_API_KEY=...
SUPABASE_URL=https://oawsvakrhhrbrxektpwz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Key decisions

- **Groq over OpenAI Whisper** — free tier, same model (`whisper-large-v3`), faster. Switch to OpenAI at scale.
- **No calendar library** — built from scratch, full style control, only needed month view.
- **expo-av** — deprecated in SDK 54 but still functional. Migrate to `expo-audio` in next pass.
- **Email auth only** — no Google/Apple OAuth in V1, can be added later via Supabase.

---

## V2 features (not built)

- AI conversation partner (Claude API + ElevenLabs TTS)
- Pronunciation feedback (Azure Cognitive Services Speech)
- Push notifications (daily reminder in target language)
