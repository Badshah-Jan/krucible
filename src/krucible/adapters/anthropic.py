"""Anthropic Adapter."""

import os
import time
from typing import Any, Dict, Tuple

from krucible.adapters.interfaces import BaseAdapter
from krucible.attacks.exceptions import AttackExecutionError

try:
    from anthropic import Anthropic, AnthropicError
except ImportError:
    Anthropic = None
    AnthropicError = Exception


class AnthropicAdapter(BaseAdapter):
    """Integrates Anthropic Claude models."""

    def __init__(self, model: str = None):
        if Anthropic is None:
            raise ImportError("The 'anthropic' package is required. Run 'pip install anthropic'.")
        self.model = model or "claude-3-haiku-20240307"
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY must be set.")
        self.client = Anthropic(api_key=self.api_key)

    def execute(self, payload: str, context: Dict[str, Any] = None) -> Tuple[str, float, Dict[str, Any]]:
        start_time = time.time()
        try:
            resp = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[{"role": "user", "content": payload}],
                temperature=context.get("temperature", 0.0) if context else 0.0,
            )
            latency_ms = (time.time() - start_time) * 1000.0
            raw_content = resp.content[0].text
            trace = {"model_used": self.model, "id": resp.id}
            return raw_content, latency_ms, trace
        except AnthropicError as e:
            raise AttackExecutionError(f"Anthropic execution failed: {str(e)}")
