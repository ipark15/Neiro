import os
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from supabase import create_client

from models import Entry
from services import whisper, storage

router = APIRouter(prefix="/entries", tags=["entries"])


def db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


@router.post("", response_model=Entry)
async def create_entry(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    date: str = Form(...),
    duration_seconds: int | None = Form(None),
):
    audio_bytes = await file.read()
    filename = file.filename or "recording.webm"

    try:
        audio_url = storage.upload_audio(audio_bytes, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    try:
        result = await whisper.transcribe(audio_bytes, filename)
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


@router.get("/{user_id}", response_model=list[Entry])
def get_entries(user_id: str):
    response = (
        db()
        .table("entries")
        .select("*")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .execute()
    )
    return [Entry(**row) for row in response.data]


@router.get("/{user_id}/{date}", response_model=Entry)
def get_entry(user_id: str, date: str):
    response = (
        db()
        .table("entries")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", date)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Entry not found.")
    return Entry(**response.data[0])


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: str):
    response = db().table("entries").select("audio_url").eq("id", entry_id).limit(1).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Entry not found.")

    audio_url = response.data[0]["audio_url"]
    storage.delete_audio(audio_url)
    db().table("entries").delete().eq("id", entry_id).execute()
