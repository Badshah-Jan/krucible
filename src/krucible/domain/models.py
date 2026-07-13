"""Core domain entities representing the Krucible ubiquitous language."""
from typing import List, Dict, Any
from datetime import datetime

from .base import DomainEntity
from .enums import PolicyResultStatus, RegressionStatus

class Target(DomainEntity):
    """Represents the AI system under test."""
    adapter_id: str
    model_name: str
    metadata: Dict[str, str] = {}

class Plugin(DomainEntity):
    """Represents a dynamically loaded extension."""
    name: str
    version: str

class ExecutionContext(DomainEntity):
    """Contextual metadata about the current test run."""
    run_id: str
    timestamp: datetime
    target: Target

class Attack(DomainEntity):
    """Represents an adversarial payload to be dispatched to the Target."""
    id: str
    name: str
    description: str
    payload: str
    tags: List[str] = []

class AttackResult(DomainEntity):
    """Represents the raw response and telemetry from the Target after an Attack."""
    attack_id: str
    raw_response: str
    latency_ms: float
    # Adapter-specific trace data (e.g. tool invocation chains, context retrieval data)
    adapter_trace: Dict[str, Any] = {}

class Policy(DomainEntity):
    """A security rule defining the acceptable boundaries of an AI response."""
    id: str
    name: str
    type: str
    rules: Dict[str, Any]

class PolicyResult(DomainEntity):
    """The outcome of evaluating a Policy against an AttackResult."""
    policy_id: str
    status: PolicyResultStatus
    score: float
    reason: str

class Evaluation(DomainEntity):
    """The complete assessment encapsulation of a single Attack."""
    attack: Attack
    result: AttackResult
    policy_results: List[PolicyResult]
    passed: bool

class TestCase(DomainEntity):
    """A logical grouping of an Attack payload and the specific Policies it must satisfy."""
    id: str
    attack: Attack
    policies: List[Policy]

class TestSuite(DomainEntity):
    """A collection of TestCases intended to be executed synchronously or asynchronously."""
    id: str
    name: str
    cases: List[TestCase]

class Baseline(DomainEntity):
    """A finalized, successful execution trace stored to calculate future regressions."""
    id: str
    created_at: datetime
    evaluations: List[Evaluation]
    metadata: Dict[str, str] = {}

class Regression(DomainEntity):
    """The mathematically calculated diff between the current Evaluation and a Baseline Evaluation."""
    attack_id: str
    status: RegressionStatus
    semantic_drift_score: float
    details: str

class Report(DomainEntity):
    """The final aggregate representation of a Krucible execution run."""
    execution_context: ExecutionContext
    evaluations: List[Evaluation]
    regressions: List[Regression]
    total_passed: int
    total_failed: int
    total_regressions: int
