"""Adapter mapping Krucible payloads to the official Google GenAI API."""

import os
import time
from pathlib import Path
from typing import Any, Dict, Tuple

try:
    from google import genai
    from google.genai.errors import APIError
except ImportError:
    genai = None
    APIError = Exception

from krucible.adapters.interfaces import BaseAdapter
from krucible.attacks.exceptions import AttackExecutionError
from krucible.config.loader import ConfigLoader


class GeminiAdapter(BaseAdapter):
    """
    Adapter integrating the modern official Google GenAI API (google-genai).
    """

    def __init__(self, model: str = None):
        """Initialize the Gemini adapter with the modern genai SDK."""
        if genai is None:
            raise ImportError(
                "The 'google-genai' package is required. Run 'pip install google-genai'."
            )

        if model is None:
            config_path = Path.cwd() / "krucible.yml"
            if config_path.exists():
                config = ConfigLoader.load(config_path)
                self.model = config.target.model
            else:
                self.model = "gemini-2.0-flash"
        else:
            self.model = model

        self.api_key = os.environ.get("Gemini_API_KEY") or os.environ.get(
            "GEMINI_API_KEY"
        )
        if not self.api_key:
            raise ValueError(
                "The 'Gemini_API_KEY' environment variable must be set to use the GeminiAdapter."
            )

        self.client = genai.Client(api_key=self.api_key)

    def execute(
        self, payload: str, context: Dict[str, Any] = None
    ) -> Tuple[str, float, Dict[str, Any]]:
        """Executes the payload against Gemini API disabling safety filters natively."""
        start_time = time.time()
        try:
            temperature = context.get("temperature", 0.0) if context else 0.0

            # Disable safety filters natively so Krucible can analyze raw model behavior
            safety_settings = [
                genai.types.SafetySetting(
                    category=genai.types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
                ),
                genai.types.SafetySetting(
                    category=genai.types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
                ),
                genai.types.SafetySetting(
                    category=genai.types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
                ),
                genai.types.SafetySetting(
                    category=genai.types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
                ),
            ]

            response = self.client.models.generate_content(
                model=self.model,
                contents=payload,
                config=genai.types.GenerateContentConfig(
                    temperature=temperature, safety_settings=safety_settings
                ),
            )

            latency_ms = (time.time() - start_time) * 1000.0

            if response.text is not None:
                raw_content = response.text
            else:
                raw_content = "[BLOCKED BY NATIVE GEMINI FILTER]"

            trace = {
                "model_used": self.model,
                "finish_reason": response.candidates[0].finish_reason.name
                if response.candidates
                else "unknown",
            }

            return raw_content, latency_ms, trace

        except Exception as e:
            raise AttackExecutionError(
                f"Gemini Adapter network execution failed: {str(e)}"
            )
