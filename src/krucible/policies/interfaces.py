"""Abstract interfaces for the Policy Engine."""

from abc import ABC, abstractmethod

from krucible.domain.models import AttackResult, Policy, PolicyResult


class PolicyEvaluator(ABC):
    """
    Abstract strategy for policy evaluation.

    Every policy type (Regex, Keyword, LLM) must implement this interface.
    """

    @abstractmethod
    def evaluate(self, policy: Policy, result: AttackResult) -> PolicyResult:
        """
        Evaluate an AttackResult against the rules defined in a Policy.

        Args:
            policy: The strict domain model defining the rule bounds.
            result: The target's response telemetry.

        Returns:
            PolicyResult: A structured domain entity capturing the PASS/FAIL state.
        """
        pass
