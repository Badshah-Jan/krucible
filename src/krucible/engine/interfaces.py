"""Abstract definitions for external dependencies used by the Orchestrator."""

from typing import List, Protocol

from krucible.domain.models import Attack, AttackResult, Policy, PolicyResult


class AttackRunnerProtocol(Protocol):
    """Structural typing protocol for dependency injected Attack Runners."""

    def execute(self, attack: Attack) -> AttackResult: ...


class PolicyEngineProtocol(Protocol):
    """Structural typing protocol for dependency injected Policy Engines."""

    def evaluate(self, policies: List[Policy], result: AttackResult) -> List[PolicyResult]: ...
