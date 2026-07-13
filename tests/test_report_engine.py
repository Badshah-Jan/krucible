"""Tests for the Reporting Engine."""
import json
import pytest
from pathlib import Path
from krucible.reports.engine import ReportEngine
from krucible.reports.json_reporter import JsonReporter
from krucible.reports.cli_reporter import CliReporter
from krucible.reports.exceptions import ReportGenerationError
from krucible.domain.models import Evaluation, Regression, Attack, Policy, PolicyResult
from krucible.domain.enums import RegressionStatus, PolicyStatus

@pytest.fixture
def dummy_data():
    atk = Attack(id="atk-1", type="injection", name="Test", description="d", payload="p", tags=[])
    pol = Policy(id="pol-1", name="Test", type="keyword", rules={})
    pr = PolicyResult(policy_id="pol-1", passed=False, reason="Failed", match_details={})
    
    eval_res = Evaluation(
        attack=atk,
        adapter_used="mock",
        model_used="test-model",
        passed=False,
        latency_ms=10.0,
        policy_results=[pr],
        telemetry={}
    )
    
    reg = Regression(
        attack_id="atk-1",
        status=RegressionStatus.REGRESSION_DETECTED,
        reason="Flipped",
        differences={}
    )
    return [eval_res], [reg]

def test_json_reporter(dummy_data):
    evals, regs = dummy_data
    engine = ReportEngine()
    engine.register_reporter("json", JsonReporter())
    
    summary = engine.build_summary(evals, regs, "openai", "gpt-4", 150.0)
    output = engine.generate("json", summary)
    
    data = json.loads(output)
    assert data["target_adapter"] == "openai"
    assert data["failed"] == 1
    assert data["regressions"] == 1
    assert data["execution_duration_ms"] == 150.0

def test_cli_reporter_success(dummy_data):
    evals, regs = dummy_data
    engine = ReportEngine()
    engine.register_reporter("cli", CliReporter())
    
    summary = engine.build_summary(evals, regs, "openai", "gpt-4", 150.0)
    output = engine.generate("cli", summary)
    assert output == "CLI Report Generated successfully."

def test_missing_reporter(dummy_data):
    engine = ReportEngine()
    summary = engine.build_summary([], [], "mock", "mock", 0.0)
    
    with pytest.raises(ReportGenerationError, match="not registered"):
        engine.generate("html", summary)

def test_save_to_file(tmp_path, dummy_data):
    engine = ReportEngine()
    f = tmp_path / "reports" / "report.json"
    engine.save_to_file('{"test": "ok"}', f)
    
    assert f.exists()
    assert json.loads(f.read_text())["test"] == "ok"
