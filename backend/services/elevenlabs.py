import os
import httpx

_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"


def text_to_speech(text: str, voice_id: str) -> bytes:
    response = httpx.post(
        f"{_API_URL}/{voice_id}",
        headers={
            "xi-api-key": os.environ["ELEVENLABS_API_KEY"],
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        },
        timeout=30.0,
    )
    response.raise_for_status()
    return response.content
