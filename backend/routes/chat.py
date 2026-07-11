import json
import base64
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

from services import whisper
from services import claude_service, elevenlabs
from config.personas import PERSONAS, DEFAULT_PERSONA

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatResponse(BaseModel):
    user_message: str
    ai_text: str
    ai_audio_base64: str


@router.post("/message", response_model=ChatResponse)
async def chat_message(
    file: UploadFile = File(...),
    language: str = Form(...),
    persona: str = Form(DEFAULT_PERSONA),
    # JSON-encoded list of {role, content} dicts — last N turns of conversation
    conversation_history: str = Form("[]"),
):
    audio_bytes = await file.read()
    filename = file.filename or "recording.webm"

    # Step 1: Transcribe audio (no DB save — chat messages are ephemeral)
    try:
        result = await whisper.transcribe(audio_bytes, filename, language)
        user_message = result["transcript"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    # Step 2: Parse conversation history
    try:
        history = json.loads(conversation_history)
    except Exception:
        history = []

    # Step 3: Get Claude response
    try:
        ai_text = claude_service.get_response(user_message, language, history, persona)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI response failed: {e}")

    # Step 4: Convert AI text to speech
    try:
        persona_config = PERSONAS.get(persona, PERSONAS[DEFAULT_PERSONA])
        audio_bytes_out = elevenlabs.text_to_speech(ai_text, persona_config["voice_id"])
        ai_audio_b64 = base64.b64encode(audio_bytes_out).decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {e}")

    return ChatResponse(
        user_message=user_message,
        ai_text=ai_text,
        ai_audio_base64=ai_audio_b64,
    )
