"""Adapter mapping Krucible payloads to the new OpenAI Responses API."""

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


class OpenAIAdapter(BaseAdapter):
    """
    Adapter integrating the official OpenAI Responses API.
    Acts as an Anti-Corruption Layer shielding Krucible from external SDK complexity.
    """

    def __init__(self, model: str = None):
        """
        Initialize the OpenAI adapter.

        Args:
            model: Optional model name. If None, it dynamically reads from krucible.yml.
        """
        if OpenAI is None:
            raise ImportError(
                "The 'openai' package is required. Run 'pip install openai' or 'uv add openai'."
            )

        # Dynamically read the model from krucible.yml if not explicitly injected
        if model is None:
            config_path = Path.cwd() / "krucible.yml"
            if config_path.exists():
                config = ConfigLoader.load(config_path)
                self.model = config.target.model
            else:
                self.model = "gpt-4o"
        else:
            self.model = model

        self.api_key = os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "The 'OPENAI_API_KEY' environment variable must be set to use the OpenAIAdapter."
            )

        self.client = OpenAI(api_key=self.api_key)

    def execute(
        self, payload: str, context: Dict[str, Any] = None
    ) -> Tuple[str, float, Dict[str, Any]]:
        """Executes the payload against the OpenAI Responses API and extracts standard telemetry."""
        start_time = time.time()
        try:
            # Enforce determinism for security testing
            temperature = context.get("temperature", 0.0) if context else 0.0

            # Use the new Responses API rather than legacy Chat Completions
            response = self.client.responses.create(
                model=self.model, input=payload, temperature=temperature
            )

            latency_ms = (time.time() - start_time) * 1000.0

            if not getattr(response, "output", None):
                raise AttackExecutionError(
                    "OpenAI Responses API returned an empty output stream."
                )

            # Safely stringify the complex ResponseOutputMessage objects for our core engines
            raw_content = str(response.output)

            # Map specific Responses API metadata into the standard adapter_trace dictionary
            trace = {
                "id": getattr(response, "id", "unknown"),
                "model_used": getattr(response, "model", self.model),
                "usage": response.usage.model_dump()
                if getattr(response, "usage", None)
                else {},
            }

            return raw_content, latency_ms, trace

        except OpenAIError as e:
            raise AttackExecutionError(
                f"OpenAI Adapter network execution failed: {str(e)}"
            )
