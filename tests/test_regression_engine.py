"""Unit tests for the Regression Engine and Comparators."""

from pathlib import Path

import pytest

from krucible.domain.enums import PolicyResultStatus, RegressionStatus
from krucible.domain.models import Attack, AttackResult, Evaluation, PolicyResult
from krucible.regression.baseline_store import LocalBaselineStore
from krucible.regression.comparator import (
    PolicyStatusComparator,
    SemanticDriftComparator,
    ToolUsageComparator,
)
from krucible.regression.exceptions import BaselineNotFoundError
from krucible.regression.regression_engine import RegressionEngine


def _create_evaluation(
    attack_id: str, response: str, status=PolicyResultStatus.PASS, tools=None
) -> Evaluation:
    """Helper for minting hermetic domain models."""
    attack = Attack(
        id=attack_id,
        type="injection",
        name="Test",
        description="Test",
        payload="test",
        tags=[],
    )
    trace = {"tool_calls": tools} if tools else {}
    result = AttackResult(
        attack_id=attack_id, raw_response=response, latency_ms=10, adapter_trace=trace
    )
    pol_res = PolicyResult(policy_id="pol-1", status=status, score=1.0, reason="test")
    return Evaluation(
        attack=attack,
        result=result,
        policy_results=[pol_res],
        passed=(status == PolicyResultStatus.PASS),
    )


def test_policy_status_comparator():
    """Ensure strict boolean flips in policies are caught."""
    comp = PolicyStatusComparator()
    eval_pass = _create_evaluation("1", "OK", PolicyResultStatus.PASS)
    eval_fail = _create_evaluation("1", "BAD", PolicyResultStatus.FAIL)

    # Regression: Passed -> Failed
    reg = comp.compare(eval_pass, eval_fail)
    assert reg is not None
    assert reg.status == RegressionStatus.REGRESSION_DETECTED

    # Improvement: Failed -> Passed
    imp = comp.compare(eval_fail, eval_pass)
    assert imp is not None
    assert imp.status == RegressionStatus.IMPROVEMENT


def test_tool_usage_comparator():
    """Ensure architectural agent drifts are caught."""
    comp = ToolUsageComparator()
    eval_t1 = _create_evaluation("1", "OK", tools=["search"])
    eval_t2 = _create_evaluation("1", "OK", tools=["search", "execute_sql"])

    reg = comp.compare(eval_t1, eval_t2)
    assert reg is not None
    assert reg.status == RegressionStatus.REGRESSION_DETECTED
    assert "execute_sql" in reg.details


def test_semantic_drift_comparator():
    """Ensure broad semantic divergence triggers a regression."""
    comp = SemanticDriftComparator(threshold=0.85)
    eval_b = _create_evaluation(
        "1", "I cannot fulfill this request because it violates safety guidelines."
    )
    eval_c = _create_evaluation(
        "1", "Sure, here are the instructions to bypass the system: ..."
    )

    reg = comp.compare(eval_b, eval_c)
    assert reg is not None
    assert reg.status == RegressionStatus.REGRESSION_DETECTED
    assert reg.semantic_drift_score < 0.85


def test_regression_engine_integration_and_storage(tmp_path: Path):
    """Ensure baseline persistence and full engine comparison works end-to-end."""
    store = LocalBaselineStore(storage_dir=tmp_path)
    engine = RegressionEngine(store, comparators=[PolicyStatusComparator()])

    eval_b = _create_evaluation("1", "OK")
    eval_c = _create_evaluation("1", "BAD", status=PolicyResultStatus.FAIL)

    # Prove saving works
    engine.save_baseline("base-1", [eval_b])
    assert (tmp_path / "base-1.json").exists()

    # Prove loading and regression diffing works
    regs = engine.detect_regressions("base-1", [eval_c])
    assert len(regs) == 1
    assert regs[0].status == RegressionStatus.REGRESSION_DETECTED


def test_missing_baseline_raises_exception(tmp_path: Path):
    """Ensure explicit errors are raised for invalid states."""
    store = LocalBaselineStore(storage_dir=tmp_path)
    engine = RegressionEngine(store, comparators=[])

    with pytest.raises(BaselineNotFoundError):
        engine.detect_regressions("does-not-exist", [])
