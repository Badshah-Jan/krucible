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
        self.payload_key = os.environ.get("KRUCIBLE_CUSTOM_PAYLOAD_KEY", "prompt")
        if not self.url:
            raise ValueError("KRUCIBLE_CUSTOM_URL environment variable must be set.")

    def _extract_output(self, raw_content: str) -> str:
        output_key = os.environ.get("KRUCIBLE_CUSTOM_OUTPUT_KEY")
        
        try:
            import json
            data = json.loads(raw_content)
        except Exception:
            return raw_content
            
        if output_key:
            val = data
            for part in output_key.split("."):
                if isinstance(val, dict) and part in val:
                    val = val[part]
                else:
                    return raw_content
            if isinstance(val, str):
                return val
            import json as _json
            return _json.dumps(val)
            
        common_keys = ["response", "answer", "output", "content", "text", "message"]
        for key in common_keys:
            if key in data and isinstance(data[key], str):
                return data[key]
                
        return raw_content

    def execute(self, payload: str, context: Dict[str, Any] = None) -> Tuple[str, float, Dict[str, Any]]:
        start_time = time.time()
        try:
            headers = {"Content-Type": "application/json"}
            if self.auth:
                headers["Authorization"] = self.auth
                
            resp = requests.post(self.url, json={self.payload_key: payload}, headers=headers, timeout=60)
            resp.raise_for_status()
            
            latency_ms = (time.time() - start_time) * 1000.0
            raw_content = resp.text
            
            extracted_output = self._extract_output(raw_content)
            
            trace = {
                "model_used": self.model,
                "http_request": {"url": self.url, "method": "POST", "body": {self.payload_key: payload}},
                "http_response": {"status_code": resp.status_code, "body": raw_content[:1000]}
            }
            
            return extracted_output, latency_ms, trace
        except Exception as e:
            raise AttackExecutionError(f"Custom REST execution failed: {str(e)}")
