"""Dynamic registry mapping adapter types to concrete implementations."""
from typing import Dict
from krucible.adapters.interfaces import BaseAdapter
from krucible.attacks.exceptions import AttackExecutionError

class AdapterRegistry:
    """Registry pattern isolating adapter resolution from core execution logic."""
    
    def __init__(self):
        self._adapters: Dict[str, type] = {}
        
    def register(self, adapter_id: str, adapter_cls: type) -> None:
        """Register a class reference for an adapter."""
        self._adapters[adapter_id] = adapter_cls
        
    def get_adapter(self, adapter_id: str, **kwargs) -> BaseAdapter:
        """Retrieve and dynamically instantiate a BaseAdapter via its ID."""
        if adapter_id not in self._adapters:
            raise AttackExecutionError(f"No adapter registered for ID: '{adapter_id}'")
        return self._adapters[adapter_id](**kwargs)
