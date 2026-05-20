import io
import os
import math
from groq import AsyncGroq

# Groq returns ISO 639-1 codes ("en", "es"); map to our display codes
LANG_MAP = {
    "en": "EN",
    "es": "ES",
    "fr": "FR",
    "pt": "PT",
    "de": "DE",
    "ja": "JA",
}


async def transcribe(audio_bytes: bytes, filename: str) -> dict:
    client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    result = await client.audio.transcriptions.create(
        model="whisper-large-v3",
        file=audio_file,
        response_format="verbose_json",
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
