"""Ollama Adapter for local, free, offline model execution."""

import time
import requests
from typing import Any, Dict, Tuple
from krucible.adapters.interfaces import BaseAdapter
from krucible.attacks.exceptions import AttackExecutionError

class OllamaAdapter(BaseAdapter):
    """Executes payloads against a local Ollama instance securely."""
    
    def __init__(self, model: str = None):
        self.model = model or "llama3"
        self.base_url = "http://localhost:11434/api/generate"

    def execute(self, payload: str, context: Dict[str, Any] = None) -> Tuple[str, float, Dict[str, Any]]:
        start_time = time.time()
        try:
            temperature = context.get("temperature", 0.0) if context else 0.0
            
            resp = requests.post(self.base_url, json={
                "model": self.model,
                "prompt": payload,
                "stream": False,
                "options": {"temperature": temperature}
            }, timeout=60)
            
            resp.raise_for_status()
            data = resp.json()
            
            latency_ms = (time.time() - start_time) * 1000.0
            raw_content = data.get("response", "")
            trace = {"model_used": self.model, "eval_count": data.get("eval_count", 0)}
            
            return raw_content, latency_ms, trace
        except requests.exceptions.RequestException as e:
            raise AttackExecutionError(f"Ollama execution failed: {str(e)}. Is Ollama running?")
        except Exception as e:
            raise AttackExecutionError(f"Ollama Adapter error: {str(e)}")
