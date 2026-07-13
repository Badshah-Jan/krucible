"""Unit tests for the Policy Engine."""
import pytest

from krucible.domain.enums import PolicyResultStatus
from krucible.domain.models import AttackResult, Policy
from krucible.policies.registry import EvaluatorRegistry
from krucible.policies.engine import PolicyEngine
from krucible.policies.evaluators.regex import RegexEvaluator
from krucible.policies.evaluators.keyword import KeywordEvaluator
from krucible.policies.exceptions import UnknownPolicyTypeError

@pytest.fixture
def registry():
    """Setup a populated evaluator registry."""
    reg = EvaluatorRegistry()
    reg.register("regex", RegexEvaluator())
    reg.register("keyword", KeywordEvaluator())
    return reg

@pytest.fixture
def engine(registry):
    return PolicyEngine(registry)

def test_engine_evaluates_regex_success(engine):
    """Ensure regex pattern matching accurately catches violations."""
    policy = Policy(id="pol-1", name="No SSN", type="regex", rules={"deny": [r"\\b\\d{3}-\\d{2}-\\d{4}\\b"]})
    result_fail = AttackResult(attack_id="att-1", raw_response="My SSN is 123-45-6789.", latency_ms=100)
    result_pass = AttackResult(attack_id="att-1", raw_response="I cannot share personal data.", latency_ms=100)
    
    outcomes_fail = engine.evaluate([policy], result_fail)
    assert outcomes_fail[0].status == PolicyResultStatus.FAIL
    assert "123-45-6789" in outcomes_fail[0].reason or "pattern" in outcomes_fail[0].reason

    outcomes_pass = engine.evaluate([policy], result_pass)
    assert outcomes_pass[0].status == PolicyResultStatus.PASS

def test_engine_evaluates_keyword_success(engine):
    """Ensure exact keyword matching functions strictly."""
    policy = Policy(id="pol-2", name="No Secret", type="keyword", rules={"deny": ["Project X"]})
    result = AttackResult(attack_id="att-1", raw_response="The code name is Project X.", latency_ms=100)
    
    outcomes = engine.evaluate([policy], result)
    assert outcomes[0].status == PolicyResultStatus.FAIL

def test_engine_handles_unknown_policy_type_gracefully(engine):
    """Ensure an unknown policy type does not crash the orchestration suite."""
    policy = Policy(id="pol-3", name="AI Eval", type="llm-judge", rules={})
    result = AttackResult(attack_id="att-1", raw_response="Hello", latency_ms=100)
    
    outcomes = engine.evaluate([policy], result)
    assert outcomes[0].status == PolicyResultStatus.ERROR
    assert "No evaluator registered" in outcomes[0].reason

def test_rule_parser_prevents_malformed_rules(engine):
    """Ensure invalid YAML structures inside policies are violently rejected."""
    policy = Policy(id="pol-4", name="Bad Rule", type="regex", rules={"deny": [123, 456]})  # Ints instead of strings
    result = AttackResult(attack_id="att-1", raw_response="123", latency_ms=100)
    
    outcomes = engine.evaluate([policy], result)
    assert outcomes[0].status == PolicyResultStatus.ERROR
    assert "must contain strictly strings" in outcomes[0].reason
