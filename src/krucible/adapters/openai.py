"""Adapter for the OpenAI Chat Completions API."""
import os
import time
from typing import Dict, Any, Tuple

try:
    from openai import OpenAI, OpenAIError
except ImportError:
    OpenAI = None
    OpenAIError = Exception

from krucible.adapters.interfaces import BaseAdapter
from krucible.attacks.exceptions import AttackExecutionError

class OpenAIAdapter(BaseAdapter):
    """
    Adapter mapping Krucible payloads to OpenAI API requests.
    Acts as an Anti-Corruption Layer shielding engines from external SDK complexity.
    """
    
    def __init__(self, model: str):
        """
        Initialize the OpenAI adapter.
        
        Args:
            model: The target OpenAI model (e.g. 'gpt-4o', 'gpt-3.5-turbo').
        """
        if OpenAI is None:
            raise ImportError("The 'openai' package is required. Run 'pip install openai' or 'uv add openai'.")
            
        self.model = model
        self.api_key = os.environ.get("OPENAI_API_KEY")
        
        if not self.api_key:
            raise ValueError("The 'OPENAI_API_KEY' environment variable must be set to use the OpenAIAdapter.")
            
        self.client = OpenAI(api_key=self.api_key)
        
    def execute(self, payload: str, context: Dict[str, Any] = None) -> Tuple[str, float, Dict[str, Any]]:
        """Executes the payload against the OpenAI API and extracts standard telemetry."""
        start_time = time.time()
        try:
            # We enforce a temperature of 0.0 by default to ensure deterministic testing
            temperature = context.get("temperature", 0.0) if context else 0.0
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": payload}],
                temperature=temperature
            )
            
            latency_ms = (time.time() - start_time) * 1000.0
            
            if not response.choices:
                raise AttackExecutionError("OpenAI API returned an empty choices array.")
                
            raw_content = response.choices[0].message.content or ""
            
            # Map specific OpenAI metadata into the standard adapter_trace dictionary
            trace = {
                "id": response.id,
                "model_used": response.model,
                "usage": response.usage.model_dump() if response.usage else {}
            }
            
            return raw_content, latency_ms, trace
            
        except OpenAIError as e:
            raise AttackExecutionError(f"OpenAI Adapter network execution failed: {str(e)}")
