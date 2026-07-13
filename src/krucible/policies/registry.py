"""Dynamic registry for mapping policy types to evaluator strategies."""

from typing import Dict

from krucible.policies.exceptions import UnknownPolicyTypeError
from krucible.policies.interfaces import PolicyEvaluator


class EvaluatorRegistry:
    """Registry pattern mapping string types to Strategy implementations."""

    def __init__(self):
        self._evaluators: Dict[str, PolicyEvaluator] = {}

    def register(self, policy_type: str, evaluator: PolicyEvaluator) -> None:
        """Register a new policy evaluator strategy."""
        self._evaluators[policy_type] = evaluator

    def get_evaluator(self, policy_type: str) -> PolicyEvaluator:
        """Retrieve an evaluator strategy by its type identifier."""
        if policy_type not in self._evaluators:
            raise UnknownPolicyTypeError(
                f"No evaluator registered for policy type: '{policy_type}'"
            )
        return self._evaluators[policy_type]
