import os
import uuid
import mimetypes
from supabase import create_client, Client

BUCKET = "audio-entries"

CONTENT_TYPE_MAP = {
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
}


def get_client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def upload_audio(audio_bytes: bytes, filename: str) -> str:
    supabase = get_client()
    path = f"{uuid.uuid4()}/{filename}"

    ext = os.path.splitext(filename)[1].lower()
    content_type = CONTENT_TYPE_MAP.get(ext, "audio/webm")

    supabase.storage.from_(BUCKET).upload(
        path=path,
        file=audio_bytes,
        file_options={"content-type": content_type},
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
