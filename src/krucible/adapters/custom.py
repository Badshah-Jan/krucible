"""Custom REST Adapter for proprietary or external endpoints."""

import os
import time
import requests
from typing import Any, Dict, Tuple
from krucible.adapters.interfaces import BaseAdapter
from krucible.attacks.exceptions import AttackExecutionError

class CustomRestAdapter(BaseAdapter):
    """Executes payloads against an arbitrary REST endpoint."""
    
    def __init__(self, model: str = None):
        self.model = model or "custom"
        self.url = os.environ.get("KRUCIBLE_CUSTOM_URL")
        self.auth = os.environ.get("KRUCIBLE_CUSTOM_AUTH")
        if not self.url:
            raise ValueError("KRUCIBLE_CUSTOM_URL environment variable must be set.")

    def execute(self, payload: str, context: Dict[str, Any] = None) -> Tuple[str, float, Dict[str, Any]]:
        start_time = time.time()
        try:
            headers = {"Content-Type": "application/json"}
            if self.auth:
                headers["Authorization"] = self.auth
                
            resp = requests.post(self.url, json={"prompt": payload}, headers=headers, timeout=60)
            resp.raise_for_status()
            
            latency_ms = (time.time() - start_time) * 1000.0
            raw_content = resp.text
            trace = {"model_used": self.model}
            
            return raw_content, latency_ms, trace
        except Exception as e:
            raise AttackExecutionError(f"Custom REST execution failed: {str(e)}")
