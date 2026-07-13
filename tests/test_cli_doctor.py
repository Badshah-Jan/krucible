"""Test the doctor command."""
from typer.testing import CliRunner
from krucible.cli.app import app

runner = CliRunner()

def test_doctor_command():
    """Ensure doctor command passes under normal test environments."""
    result = runner.invoke(app, ["doctor"])
    assert result.exit_code == 0
    assert "System checks passed." in result.stdout
