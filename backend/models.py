from pydantic import BaseModel
from typing import Optional


class Entry(BaseModel):
    id: str
    user_id: str
    date: str
    language: str
    transcript: Optional[str]
    audio_url: str
    duration_seconds: Optional[int]
    created_at: str
