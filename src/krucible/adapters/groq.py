"""Groq Adapter using OpenAI SDK."""

import os
import time
from typing import Any, Dict, Tuple

from krucible.adapters.interfaces import BaseAdapter
from krucible.attacks.exceptions import AttackExecutionError

try:
    from openai import OpenAI, OpenAIError
except ImportError:
    OpenAI = None
    OpenAIError = Exception


class GroqAdapter(BaseAdapter):
    """Integrates Groq ultra-fast inference via the OpenAI SDK."""

    def __init__(self, model: str = None):
        if OpenAI is None:
            raise ImportError("The 'openai' package is required. Run 'pip install openai'.")
        self.model = model or "llama3-8b-8192"
        self.api_key = os.environ.get("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY must be set.")
        self.client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=self.api_key)

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
                raise AttackExecutionError("Groq returned an empty choices array.")
            raw_content = str(response.choices[0].message.content)
            trace = {"model_used": getattr(response, "model", self.model)}
            return raw_content, latency_ms, trace
        except OpenAIError as e:
            raise AttackExecutionError(f"Groq network execution failed: {str(e)}")
