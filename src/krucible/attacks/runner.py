"""Core orchestrator for attack execution."""
from krucible.domain.models import Attack, AttackResult
from krucible.adapters.interfaces import BaseAdapter
from krucible.attacks.registry import AttackRegistry
from krucible.attacks.exceptions import AttackExecutionError

class AttackRunner:
    """
    Orchestrates the lifecycle of an attack against a target.
    
    Strictly isolated from evaluation logic and baseline comparisons.
    Focuses entirely on I/O, payload preparation, and telemetry normalization.
    """
    
    def __init__(self, registry: AttackRegistry, adapter: BaseAdapter):
        self.registry = registry
        self.adapter = adapter
        
    def execute(self, attack: Attack) -> AttackResult:
        """
        Executes a single Attack entity.
        
        Args:
            attack: The domain model containing the adversarial parameters.
            
        Returns:
            AttackResult: The strictly typed response and telemetry data.
        """
        try:
            # Resolve strategy and construct final string payload
            strategy = self.registry.get_strategy(attack.type)
            prepared_payload = strategy.prepare_payload(attack)
            
            # Anti-Corruption Layer: Adapter isolates network/framework chaos
            raw_response, latency, trace = self.adapter.execute(prepared_payload)
            
            # Map back to internal ubiquitous language
            return AttackResult(
                attack_id=attack.id,
                raw_response=raw_response,
                latency_ms=latency,
                adapter_trace=trace
            )
        except Exception as e:
            raise AttackExecutionError(f"Critical failure executing attack {attack.id}: {str(e)}")
