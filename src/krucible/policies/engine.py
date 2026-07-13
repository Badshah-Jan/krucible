"""Core Policy Engine Orchestrator."""
from typing import List

from krucible.domain.models import AttackResult, Policy, PolicyResult
from krucible.policies.registry import EvaluatorRegistry

class PolicyEngine:
    """
    Orchestrates the evaluation of an AttackResult against an array of Policies.
    
    Adheres strictly to the Open/Closed Principle via the Strategy Pattern.
    """
    
    def __init__(self, registry: EvaluatorRegistry):
        self.registry = registry
        
    def evaluate(self, policies: List[Policy], result: AttackResult) -> List[PolicyResult]:
        """
        Evaluate a sequence of domain Policies against a domain AttackResult.
        
        Args:
            policies: The array of policies to enforce.
            result: The target AI's execution telemetry.
            
        Returns:
            A list of perfectly structured PolicyResult outcomes.
        """
        outcomes = []
        for policy in policies:
            try:
                evaluator = self.registry.get_evaluator(policy.type)
                outcome = evaluator.evaluate(policy, result)
                outcomes.append(outcome)
            except Exception as e:
                # Security First: A single malformed policy must not crash the entire security suite.
                # We return a structured ERROR entity ensuring pipeline continuity.
                from krucible.domain.enums import PolicyResultStatus
                outcomes.append(PolicyResult(
                    policy_id=policy.id,
                    status=PolicyResultStatus.ERROR,
                    score=0.0,
                    reason=f"Engine Strategy Error: {str(e)}"
                ))
        return outcomes
