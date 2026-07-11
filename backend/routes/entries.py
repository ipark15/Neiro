import os
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel
from supabase import create_client

from models import Entry
from services import whisper, storage


class TranscriptUpdate(BaseModel):
    transcript: str

router = APIRouter(prefix="/entries", tags=["entries"])


def db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def current_user_id(authorization: str = Header(...)) -> str:
    """Validate the Supabase JWT from the Authorization header and return the user id.

    The service-role client bypasses RLS, so every route must scope queries to
    this id — never to a client-supplied user_id.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        response = db().auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    if not response or not response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
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

    try:
        audio_url = storage.upload_audio(audio_bytes, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    try:
        result = await whisper.transcribe(audio_bytes, filename, language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

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
        response = db().table("entries").insert(row).execute()
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
