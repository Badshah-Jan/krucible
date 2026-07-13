"""Tests for the init CLI command."""

from typer.testing import CliRunner

from krucible.cli.app import app

runner = CliRunner()


def test_init_command_creates_files(tmp_path, monkeypatch):
    """Ensure the CLI command outputs success and creates files in cwd."""
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(app, ["init"])

    assert result.exit_code == 0
    assert "Successfully initialized" in result.stdout
    assert (tmp_path / "krucible.yml").exists()


def test_init_command_aborts_gracefully(tmp_path, monkeypatch):
    """Ensure the CLI command warns the user safely without failure."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "krucible.yml").write_text("existing", encoding="utf-8")

    result = runner.invoke(app, ["init"])

    assert result.exit_code == 0
    assert "Warning" in result.stdout
    assert "Initialization aborted safely" in result.stdout
