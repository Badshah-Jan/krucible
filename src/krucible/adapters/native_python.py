"""Native Python Adapter for testing LangChain, CrewAI, etc. without REST APIs."""
import importlib.util
import time
import sys
from pathlib import Path
from typing import Any, Dict, Tuple
from krucible.adapters.interfaces import BaseAdapter
from krucible.attacks.exceptions import AttackExecutionError

class NativePythonAdapter(BaseAdapter):
    """Executes payloads by hooking directly into a local Python function."""
    def __init__(self, model: str = None):
        # For NativePythonAdapter, 'model' config holds the target string like "app.py:run_agent"
        if not model or ":" not in model:
            raise ValueError("Native Python target must be formatted as 'filepath.py:function_name'")
        self.file_path, self.func_name = model.split(":", 1)
        self.model = model
        
    def execute(self, payload: str, context: Dict[str, Any] = None) -> Tuple[str, float, Dict[str, Any]]:
        start_time = time.time()
        try:
            path = Path(self.file_path).resolve()
            if not path.exists():
                raise FileNotFoundError(f"Python file {self.file_path} not found.")
                
            # Add directory to path to allow internal imports in the target file
            sys.path.insert(0, str(path.parent))
            
            spec = importlib.util.spec_from_file_location("native_module", str(path))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            if not hasattr(module, self.func_name):
                raise AttributeError(f"Function '{self.func_name}' not found in {self.file_path}")
                
            func = getattr(module, self.func_name)
            
            # Execute the function natively
            result = func(payload)
            
            # Clean up path
            sys.path.pop(0)
            
            latency_ms = (time.time() - start_time) * 1000.0
            return str(result), latency_ms, {"model_used": f"python:{self.model}"}
        except Exception as e:
            raise AttackExecutionError(f"Native Python execution failed: {str(e)}")
