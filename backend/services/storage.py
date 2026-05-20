import os
import uuid
from supabase import create_client, Client

BUCKET = "audio-entries"


def get_client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def upload_audio(audio_bytes: bytes, filename: str) -> str:
    supabase = get_client()
    path = f"{uuid.uuid4()}/{filename}"

    supabase.storage.from_(BUCKET).upload(
        path=path,
        file=audio_bytes,
        file_options={"content-type": "audio/m4a"},
    )

    return supabase.storage.from_(BUCKET).get_public_url(path)


def delete_audio(audio_url: str) -> None:
    supabase = get_client()
    # Public URL format: .../object/public/audio-entries/<path>
    marker = f"/object/public/{BUCKET}/"
    idx = audio_url.find(marker)
    if idx == -1:
        return
    path = audio_url[idx + len(marker):]
    supabase.storage.from_(BUCKET).remove([path])
