"""Tests for the Evaluation Pipeline orchestrator."""
import pytest

from krucible.domain.models import Attack, Policy, AttackResult, PolicyResult, Evaluation
from krucible.domain.enums import PolicyResultStatus
from krucible.engine.orchestrator import EvaluationOrchestrator
from krucible.engine.exceptions import PipelineExecutionError

class MockAttackRunner:
    """Hermetic mock for the Attack Runner."""
    def __init__(self, should_fail=False):
        self.should_fail = should_fail
        
    def execute(self, attack: Attack) -> AttackResult:
        if self.should_fail:
            raise RuntimeError("Mock network failure")
        return AttackResult(attack_id=attack.id, raw_response="Mocked", latency_ms=10.0, adapter_trace={})

class MockPolicyEngine:
    """Hermetic mock for the Policy Engine."""
    def __init__(self, force_fail=False):
        self.force_fail = force_fail
        
    def evaluate(self, policies, result) -> list[PolicyResult]:
        status = PolicyResultStatus.FAIL if self.force_fail else PolicyResultStatus.PASS
        return [PolicyResult(policy_id=p.id, status=status, score=1.0, reason="Mocked") for p in policies]

@pytest.fixture
def orchestrator():
    """Provides a fully mocked orchestrator."""
    return EvaluationOrchestrator(MockAttackRunner(), MockPolicyEngine())

def test_pipeline_orchestrates_flow_successfully(orchestrator):
    """Ensure runner and policy engines are chained correctly yielding an Evaluation."""
    attack = Attack(id="atk-1", type="injection", name="Test", description="test", payload="test", tags=[])
    policy = Policy(id="pol-1", name="Test Policy", type="regex", rules={})
    
    evaluation = orchestrator.evaluate_attack(attack, [policy])
    
    assert isinstance(evaluation, Evaluation)
    assert evaluation.passed is True
    assert evaluation.attack.id == "atk-1"
    assert evaluation.result.raw_response == "Mocked"
    assert len(evaluation.policy_results) == 1
    assert evaluation.policy_results[0].policy_id == "pol-1"

def test_pipeline_aggregates_failures_correctly():
    """Ensure that if the policy engine returns a FAIL, the Evaluation fails."""
    orchestrator = EvaluationOrchestrator(MockAttackRunner(), MockPolicyEngine(force_fail=True))
    attack = Attack(id="atk-1", type="injection", name="Test", description="test", payload="test", tags=[])
    policy = Policy(id="pol-1", name="Test Policy", type="regex", rules={})
    
    evaluation = orchestrator.evaluate_attack(attack, [policy])
    
    assert evaluation.passed is False

def test_pipeline_propagates_exceptions_safely():
    """Ensure unhandled engine failures are safely caught and wrapped in PipelineExecutionError."""
    orchestrator = EvaluationOrchestrator(MockAttackRunner(should_fail=True), MockPolicyEngine())
    attack = Attack(id="atk-1", type="injection", name="Test", description="test", payload="test", tags=[])
    policy = Policy(id="pol-1", name="Test Policy", type="regex", rules={})
    
    with pytest.raises(PipelineExecutionError) as exc:
        orchestrator.evaluate_attack(attack, [policy])
    
    assert "Mock network failure" in str(exc.value)
