"""Tests for the domain models."""
import pytest
from pydantic import ValidationError

from krucible.domain.enums import PolicyResultStatus
from krucible.domain.models import Attack, PolicyResult, Evaluation, AttackResult

def test_domain_entity_immutability():
    """Ensure domain models are strictly immutable to prevent state corruption."""
    attack = Attack(id="inj-01", name="SQLi", description="Test", payload="DROP TABLE", tags=[])
    
    with pytest.raises(ValidationError):
        # Models are frozen; mutation is absolutely forbidden.
        attack.payload = "changed"

def test_evaluation_aggregation():
    """Ensure models compose correctly and handle nested validations."""
    attack = Attack(id="inj-01", name="Prompt Injection", description="Test", payload="Ignore all", tags=[])
    result = AttackResult(attack_id="inj-01", raw_response="Sure, I can ignore.", latency_ms=120.5)
    policy_res = PolicyResult(policy_id="pol-01", status=PolicyResultStatus.FAIL, score=0.0, reason="Injection succeeded")
    
    evaluation = Evaluation(
        attack=attack,
        result=result,
        policy_results=[policy_res],
        passed=False
    )
    
    assert evaluation.passed is False
    assert evaluation.attack.id == "inj-01"
    assert len(evaluation.policy_results) == 1

def test_domain_entity_forbids_extra_fields():
    """Ensure extra unknown kwargs are violently rejected to prevent payload smuggling."""
    with pytest.raises(ValidationError):
        Attack(
            id="1", 
            name="n", 
            description="d", 
            payload="p", 
            extra_field="this_is_not_allowed"  # Should trigger strict validation failure
        )
