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

# Reverse map: our display codes → ISO 639-1 for Whisper
WHISPER_LANG_MAP = {v: k for k, v in LANG_MAP.items()}


MIME_MAP = {
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
}


async def transcribe(audio_bytes: bytes, filename: str, language: str | None = None) -> dict:
    client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])

    ext = os.path.splitext(filename)[1].lower()
    mime_type = MIME_MAP.get(ext, "audio/webm")

    whisper_lang = WHISPER_LANG_MAP.get(language or "", None)

    result = await client.audio.transcriptions.create(
        model="whisper-large-v3",
        file=(filename, audio_bytes, mime_type),
        response_format="verbose_json",
        **({"language": whisper_lang} if whisper_lang else {}),
    )

    language_raw = getattr(result, "language", "") or ""
    language = LANG_MAP.get(language_raw.lower(), language_raw.upper()[:2])

    duration_seconds: int | None = None
    segments = getattr(result, "segments", None) or []
    if segments:
        duration_seconds = math.ceil(segments[-1].get("end", 0))

    return {
        "transcript": result.text,
        "language": language,
        "duration_seconds": duration_seconds,
    }
