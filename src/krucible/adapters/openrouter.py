"""Adapter mapping Krucible payloads to OpenRouter using OpenAI's client."""

import os
import time
from pathlib import Path
from typing import Any, Dict, Tuple

try:
    from openai import OpenAI, OpenAIError
except ImportError:
    OpenAI = None
    OpenAIError = Exception

from krucible.adapters.interfaces import BaseAdapter
from krucible.attacks.exceptions import AttackExecutionError
from krucible.config.loader import ConfigLoader

class OpenRouterAdapter(BaseAdapter):
    """Integrates OpenRouter via the OpenAI python SDK."""

    def __init__(self, model: str = None):
        if OpenAI is None:
            raise ImportError("The 'openai' package is required. Run 'pip install openai'.")

        if model is None:
            config_path = Path.cwd() / "krucible.yml"
            if config_path.exists():
                config = ConfigLoader.load(config_path)
                self.model = config.target.model
            else:
                self.model = "google/gemini-2.0-flash:free"
        else:
            self.model = model

        self.api_key = os.environ.get("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("The 'OPENROUTER_API_KEY' environment variable must be set.")

        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key,
        )

    def execute(self, payload: str, context: Dict[str, Any] = None) -> Tuple[str, float, Dict[str, Any]]:
        start_time = time.time()
        try:
            temperature = context.get("temperature", 0.0) if context else 0.0

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": payload}],
                temperature=temperature,
            )

            latency_ms = (time.time() - start_time) * 1000.0

            if not response.choices:
                raise AttackExecutionError("OpenRouter returned an empty choices array.")

            raw_content = str(response.choices[0].message.content)

            trace = {
                "id": getattr(response, "id", "unknown"),
                "model_used": getattr(response, "model", self.model),
                "usage": response.usage.model_dump() if getattr(response, "usage", None) else {},
            }

            return raw_content, latency_ms, trace

        except OpenAIError as e:
            raise AttackExecutionError(f"OpenRouter Adapter network execution failed: {str(e)}")
