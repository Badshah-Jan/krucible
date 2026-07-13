"""Test the version command."""
from typer.testing import CliRunner
from krucible.cli.app import app
from krucible.version import __version__

runner = CliRunner()

def test_version_command():
    """Ensure version command outputs correct version."""
    result = runner.invoke(app, ["version"])
    assert result.exit_code == 0
    assert __version__ in result.stdout
