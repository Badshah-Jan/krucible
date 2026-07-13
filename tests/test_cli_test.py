"""Tests for the end-to-end CLI test command."""
import pytest
from typer.testing import CliRunner
from krucible.cli.app import app

runner = CliRunner()

def test_krucible_test_command_missing_config(tmp_path):
    """Ensure graceful failure when configuration is missing."""
    result = runner.invoke(app, ["test", "--config", str(tmp_path / "missing.yml")])
    assert result.exit_code == 1
    assert "Error" in result.stdout

def test_krucible_test_command_mock_execution(tmp_path, monkeypatch):
    """Run an end-to-end pipeline test natively via the CLI using the MockAdapter."""
    import yaml
    config_file = tmp_path / "krucible.yml"
    config_file.write_text(yaml.dump({
        "version": "v1", 
        "target": {"adapter": "mock", "model": "mock-model"}
    }), encoding="utf-8")
    
    # We must patch cwd so that local baselines are dynamically created in the safe tmp_path
    monkeypatch.chdir(tmp_path)
    
    result = runner.invoke(app, ["test", "--config", str(config_file)])
    
    assert result.exit_code in [0, 1]
    assert "Running AI Security Regression Tests" in result.stdout
    assert "Target:" in result.stdout
    assert "Mock mock-model" in result.stdout
    assert "Summary" in result.stdout
    assert "Passed:" in result.stdout
