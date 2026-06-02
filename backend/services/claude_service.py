import os
import anthropic
from config.personas import PERSONAS, DEFAULT_PERSONA

_client: anthropic.Anthropic | None = None

LANGUAGE_NAMES = {
    "EN": "English",
    "KO": "Korean",
    "JA": "Japanese",
    "ES": "Spanish",
    "FR": "French",
    "PT": "Portuguese",
    "DE": "German",
}


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


def get_response(
    message: str,
    language: str,
    conversation_history: list[dict],
    persona: str = DEFAULT_PERSONA,
) -> str:
    persona_config = PERSONAS.get(persona, PERSONAS[DEFAULT_PERSONA])
    language_name = LANGUAGE_NAMES.get(language, language)
    system_prompt = persona_config["system_prompt_template"].format(language=language_name)

    # Append the new user message to history for this call
    messages = conversation_history + [{"role": "user", "content": message}]

    response = _get_client().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        system=system_prompt,
        messages=messages,
    )

    return response.content[0].text
