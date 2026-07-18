import os
import math
from groq import AsyncGroq

# Groq returns ISO 639-1 codes ("en", "es"); map to our display codes
LANG_MAP = {
    "en": "EN",
    "ko": "KO",
    "ja": "JA",
    "es": "ES",
    "fr": "FR",
    "pt": "PT",
    "de": "DE",
}

# Display codes ("EN") back to ISO 639-1 ("en") for the Whisper language hint
DISPLAY_TO_ISO = {display: iso for iso, display in LANG_MAP.items()}


MIME_MAP = {
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
}


_client: AsyncGroq | None = None


def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
    return _client


async def transcribe(audio_bytes: bytes, filename: str, language: str | None = None) -> dict:
    client = get_client()

    ext = os.path.splitext(filename)[1].lower()
    mime_type = MIME_MAP.get(ext, "audio/webm")

    # If the user picked a language, hint Whisper — auto-detection misfires on
    # short clips, and the hint keeps the transcript in the intended language.
    iso_hint = DISPLAY_TO_ISO.get((language or "").upper())

    kwargs = {}
    if iso_hint:
        kwargs["language"] = iso_hint

    result = await client.audio.transcriptions.create(
        model="whisper-large-v3",
        file=(filename, audio_bytes, mime_type),
        response_format="verbose_json",
        **kwargs,
    )

    language_raw = getattr(result, "language", "") or ""
    detected = LANG_MAP.get(language_raw.lower(), language_raw.upper()[:2])
    # The user's explicit choice wins over detection
    final_language = language.upper() if language and iso_hint else detected

    duration_seconds: int | None = None
    segments = getattr(result, "segments", None) or []
    if segments:
        duration_seconds = math.ceil(segments[-1].get("end", 0))

    return {
        "transcript": result.text,
        "language": final_language,
        "duration_seconds": duration_seconds,
    }
