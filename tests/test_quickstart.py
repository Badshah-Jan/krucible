"""Tests for Quickstart Wizard."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import typer

from krucible.cli.commands.quickstart import quickstart_cmd


@patch("krucible.cli.commands.quickstart.IntPrompt.ask")
def test_wizard_cancellation(mock_int):
    mock_int.return_value = 4
    with pytest.raises(typer.Exit) as exc_info:
        quickstart_cmd()
    assert exc_info.value.exit_code == 0


@patch("krucible.cli.commands.quickstart.IntPrompt.ask")
@patch("krucible.cli.commands.quickstart.Prompt.ask")
@patch("krucible.cli.commands.quickstart.test_cmd")
@patch("krucible.cli.commands.quickstart.requests.get")
def test_wizard_openai_flow(mock_get, mock_test, mock_prompt, mock_int):
    mock_int.side_effect = [1, 1]  # Journey 1, Provider 1
    mock_prompt.return_value = "sk-test-key"

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"data": [{"id": "gpt-4o-mini"}]}
    mock_get.return_value = mock_resp

    with (
        patch("krucible.cli.commands.quickstart._write_yml") as mock_write,
        patch("krucible.cli.commands.quickstart._write_sample_files"),
    ):
        with patch(
            "krucible.cli.commands.quickstart.Confirm.ask", side_effect=[True, True]
        ):  # Use default model, Save config
            try:
                quickstart_cmd()
            except typer.Exit:
                pass

            mock_test.assert_called_once_with(config_path=Path("krucible.yml"), target=None, verbose=True)


@patch("krucible.cli.commands.quickstart.IntPrompt.ask")
@patch("krucible.cli.commands.quickstart.requests.get")
def test_wizard_ollama_not_running(mock_get, mock_int):
    mock_int.side_effect = [1, 6]  # Journey 1, Provider 6

    import requests

    mock_get.side_effect = requests.exceptions.RequestException("Connection refused")

    with pytest.raises(typer.Exit) as exc_info:
        quickstart_cmd()
    assert exc_info.value.exit_code == 1
