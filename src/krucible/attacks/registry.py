"""Dynamic registry mapping attack types to preparation strategies."""
from typing import Dict

from krucible.attacks.interfaces import AttackStrategy
from krucible.attacks.exceptions import UnknownAttackTypeError

class AttackRegistry:
    """Registry pattern isolating attack types from concrete implementations."""
    
    def __init__(self):
        self._strategies: Dict[str, AttackStrategy] = {}
        
    def register(self, attack_type: str, strategy: AttackStrategy) -> None:
        self._strategies[attack_type] = strategy
        
    def get_strategy(self, attack_type: str) -> AttackStrategy:
        if attack_type not in self._strategies:
            raise UnknownAttackTypeError(f"No strategy registered for attack type: '{attack_type}'")
        return self._strategies[attack_type]
