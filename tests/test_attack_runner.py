"""Tests for the Attack Runner and Adapters."""

import pytest

from krucible.adapters.mock import MockAdapter
from krucible.attacks.payloads.strategies import (
    JailbreakStrategy,
    PromptInjectionStrategy,
)
from krucible.attacks.registry import AttackRegistry
from krucible.attacks.runner import AttackRunner
from krucible.domain.models import Attack, AttackResult


@pytest.fixture
def registry():
    reg = AttackRegistry()
    reg.register("injection", PromptInjectionStrategy())
    reg.register("jailbreak", JailbreakStrategy())
    return reg


@pytest.fixture
def mock_adapter():
    return MockAdapter(mock_response="I cannot comply.", mock_latency=12.5)


@pytest.fixture
def runner(registry, mock_adapter):
    return AttackRunner(registry, mock_adapter)


def test_runner_executes_attack_and_returns_domain_result(runner):
    """Ensure runner successfully uses strategy, triggers adapter, and returns AttackResult."""
    attack = Attack(
        id="atk-1",
        type="injection",
        name="SQLi",
        description="Test",
        payload="DROP TABLE",
        tags=[],
    )

    result = runner.execute(attack)

    assert isinstance(result, AttackResult)
    assert result.attack_id == "atk-1"
    assert result.raw_response == "I cannot comply."
    assert result.latency_ms == 12.5
    assert result.adapter_trace["mock_id"] == "mock-trace-99"
    assert "System Override: DROP TABLE" in result.adapter_trace["received_payload"]


def test_runner_handles_unregistered_strategy(runner):
    """Ensure runner fails safely on invalid attack types."""
    attack = Attack(
        id="atk-2",
        type="unsupported-type",
        name="Test",
        description="Test",
        payload="Test",
        tags=[],
    )

    with pytest.raises(Exception) as exc:
        runner.execute(attack)

    assert "Critical failure" in str(exc.value)
    assert "No strategy registered" in str(exc.value)
