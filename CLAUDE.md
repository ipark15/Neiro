# Neiro

Voice diary app for language learners. See project spec in chat history or memory.

## Backend

Run locally with:
```bash
cd backend && source venv/bin/activate && python -m uvicorn main:app --reload --port 8000
```

Use `python -m uvicorn` not bare `uvicorn` — avoids subprocess spawning system Python instead of venv.

Railway deployment pending — update `EXPO_PUBLIC_API_URL` in `.env` once deployed.
