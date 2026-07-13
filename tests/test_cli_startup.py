"""Test CLI startup and generic behaviors."""
from typer.testing import CliRunner
from krucible.cli.app import app

runner = CliRunner()

def test_no_args_shows_help():
    """Ensure running without arguments shows the help text."""
    result = runner.invoke(app, [])
    assert "Usage:" in result.stdout
    assert "Krucible: AI Security Regression Testing Platform" in result.stdout
