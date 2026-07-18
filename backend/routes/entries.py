import asyncio
import os
import time

import jwt as pyjwt
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel
from supabase import create_client

from models import Entry
from services import whisper, storage


class TranscriptUpdate(BaseModel):
    transcript: str

router = APIRouter(prefix="/entries", tags=["entries"])

_client = None


def db():
    # One shared client — creating a client per request rebuilds HTTP sessions
    # and loses connection reuse, adding a TLS handshake to every call
    global _client
    if _client is None:
        _client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    return _client


JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")

# token → (user_id, cache_expiry) for tokens validated via the network path
_token_cache: dict[str, tuple[str, float]] = {}
_TOKEN_CACHE_TTL = 300


def current_user_id(authorization: str = Header(...)) -> str:
    """Validate the Supabase JWT from the Authorization header and return the user id.

    The service-role client bypasses RLS, so every route must scope queries to
    this id — never to a client-supplied user_id.

    Set SUPABASE_JWT_SECRET (the project's JWT secret) to verify tokens locally;
    otherwise each new token costs one network round-trip to Supabase Auth,
    cached until it expires.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.removeprefix("Bearer ").strip()

    # Fast path: verify the signature locally — no network call
    if JWT_SECRET:
        try:
            header = pyjwt.get_unverified_header(token)
        except pyjwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        if header.get("alg") == "HS256":
            try:
                payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
                return payload["sub"]
            except pyjwt.InvalidTokenError:
                raise HTTPException(status_code=401, detail="Invalid or expired token.")
        # Non-HS256 project (asymmetric signing keys) — fall through to network path

    now = time.time()
    cached = _token_cache.get(token)
    if cached and cached[1] > now:
        return cached[0]

    try:
        response = db().auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    if not response or not response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    # Cache until the token expires (capped) so repeat requests skip the round-trip
    expiry = now + _TOKEN_CACHE_TTL
    try:
        claims = pyjwt.decode(token, options={"verify_signature": False})
        expiry = min(expiry, float(claims.get("exp", expiry)))
    except pyjwt.InvalidTokenError:
        pass
    if len(_token_cache) > 1000:
        for key in [k for k, v in _token_cache.items() if v[1] <= now]:
            _token_cache.pop(key, None)
    _token_cache[token] = (response.user.id, expiry)
    return response.user.id


@router.post("", response_model=Entry)
async def create_entry(
    file: UploadFile = File(...),
    date: str = Form(...),
    language: str | None = Form(None),
    duration_seconds: int | None = Form(None),
    user_id: str = Depends(current_user_id),
):
    audio_bytes = await file.read()
    filename = file.filename or "recording.webm"

    # Storage upload and transcription are independent — run them concurrently
    # (the upload is sync, so push it to a thread to keep the event loop free)
    audio_url, result = await asyncio.gather(
        asyncio.to_thread(storage.upload_audio, audio_bytes, filename),
        whisper.transcribe(audio_bytes, filename, language),
        return_exceptions=True,
    )
    if isinstance(audio_url, BaseException):
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {audio_url}")
    if isinstance(result, BaseException):
        # Don't leave an orphaned file behind when transcription fails
        try:
            storage.delete_audio(audio_url)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Transcription failed: {result}")

    # Use client-reported duration if Whisper didn't produce one
    final_duration = result["duration_seconds"] or duration_seconds

    row = {
        "user_id": user_id,
        "date": date,
        "language": result["language"],
        "transcript": result["transcript"],
        "audio_url": audio_url,
        "duration_seconds": final_duration,
    }

    try:
        response = await asyncio.to_thread(lambda: db().table("entries").insert(row).execute())
        if not response.data:
            raise HTTPException(status_code=500, detail="Database insert returned no data.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {e}")

    return Entry(**response.data[0])


@router.get("", response_model=list[Entry])
def get_entries(user_id: str = Depends(current_user_id)):
    response = (
        db()
        .table("entries")
        .select("*")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .order("created_at", desc=False)
        .execute()
    )
    return [Entry(**row) for row in response.data]


@router.patch("/{entry_id}", response_model=Entry)
def update_entry(entry_id: str, body: TranscriptUpdate, user_id: str = Depends(current_user_id)):
    response = (
        db()
        .table("entries")
        .update({"transcript": body.transcript})
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Entry not found.")
    return Entry(**response.data[0])


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: str, user_id: str = Depends(current_user_id)):
    response = (
        db()
        .table("entries")
        .select("audio_url")
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Entry not found.")

    audio_url = response.data[0]["audio_url"]
    storage.delete_audio(audio_url)
    db().table("entries").delete().eq("id", entry_id).eq("user_id", user_id).execute()
