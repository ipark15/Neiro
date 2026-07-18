# Neiro — Voice Diary App

## What this app is

Neiro is a voice diary app for language learners. Record voice entries, get them auto-transcribed, browse them on a calendar. Ships as an Expo web app (deployed on Vercel) with the same codebase targeting iOS/Android later.

---

## Current status (V1 — web deployed on Vercel)

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

### What's pending
- Backend hosting (Railway planned; backend runs locally otherwise — see below)
- Multiple entries per day: the DB allows them but the calendar shows only the latest per day (needs a product decision)

---

## Tech stack

### Frontend (web + mobile)
- Expo SDK 54, React Native, TypeScript
- Expo Router (file-based navigation), static web output, deployed to Vercel
- `expo-audio` for recording/playback on native; MediaRecorder + HTML Audio on web (platform-split via `.web.tsx` files and `Platform.OS` checks)
- `axios` for API calls (JWT attached via request interceptor)
- `@supabase/supabase-js` for auth

### Backend
- Python 3.11, FastAPI, Uvicorn/Gunicorn
- Groq API (`whisper-large-v3`) for transcription — free tier
- `supabase-py` for DB and storage
- Deploy target: Railway (pending)

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

### Backend (Railway — pending)
1. railway.app → New Project → Deploy from GitHub → select Neiro
2. Set root directory to `backend`
3. Add env vars: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
4. After deploy, update `EXPO_PUBLIC_API_URL` in frontend `.env` / Vercel env with the Railway URL

---

## Environment variables

### Frontend (`/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://oawsvakrhhrbrxektpwz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=http://<your-mac-ip>:8000   ← https Railway URL in production
```

### Backend (`/backend/.env`)
```
GROQ_API_KEY=...
SUPABASE_URL=https://oawsvakrhhrbrxektpwz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...   ← optional but recommended: Dashboard → Settings → API → JWT Secret.
                            Lets the backend verify tokens locally (~0ms) instead of a
                            network round-trip to Supabase Auth on each new token.
```

---

## Key decisions

- **Groq over OpenAI Whisper** — free tier, same model (`whisper-large-v3`), faster. Switch to OpenAI at scale.
- **No calendar library** — built from scratch, full style control, only needed month view.
- **expo-audio** — migrated from deprecated expo-av. Note the AudioMode keys are `playsInSilentMode` / `allowsRecording` (no `IOS` suffix — the old expo-av names are silently ignored).
- **JWT-verified API** — the backend uses the service-role key (bypasses RLS), so every route derives the user from the Supabase JWT and scopes queries to it.
- **Email auth only** — no Google/Apple OAuth in V1, can be added later via Supabase.

---

## V2 features (not built)

- AI conversation partner (Claude API + ElevenLabs TTS)
- Pronunciation feedback (Azure Cognitive Services Speech)
- Push notifications (daily reminder in target language)
