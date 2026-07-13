"""Tests for Quickstart Wizard."""

import pytest
from unittest.mock import patch, MagicMock
from krucible.cli.commands.quickstart import quickstart_cmd
import typer

@patch("krucible.cli.commands.quickstart.IntPrompt.ask")
def test_wizard_cancellation(mock_int):
    mock_int.return_value = 6
    with pytest.raises(typer.Exit) as exc_info:
        quickstart_cmd()
    assert exc_info.value.exit_code == 0

@patch("krucible.cli.commands.quickstart.IntPrompt.ask")
@patch("krucible.cli.commands.quickstart.Prompt.ask")
@patch("krucible.cli.commands.quickstart.init_cmd")
@patch("krucible.cli.commands.quickstart.doctor_cmd")
@patch("krucible.cli.commands.quickstart.test_cmd")
@patch("krucible.cli.commands.quickstart.OpenAIAdapter")
def test_wizard_openai_flow(mock_adapter, mock_test, mock_doctor, mock_init, mock_prompt, mock_int):
    mock_int.return_value = 3 # OpenAI
    mock_prompt.side_effect = ["gpt-4", "sk-test-key"]
    
    mock_adapter_instance = MagicMock()
    mock_adapter.return_value = mock_adapter_instance
    
    with patch("krucible.cli.commands.quickstart._write_yml") as mock_write, patch("krucible.cli.commands.quickstart._write_sample_files"):
        with patch("krucible.cli.commands.quickstart.Confirm.ask", return_value=True):
            # Bypass typer.Exit
            try:
                quickstart_cmd()
            except typer.Exit:
                pass
            
            mock_init.assert_called_once()
            mock_doctor.assert_called_once()
            mock_test.assert_called_once()
            mock_adapter_instance.execute.assert_called_once_with("Hello", context={"temperature": 0.0})

@patch("krucible.cli.commands.quickstart.IntPrompt.ask")
@patch("krucible.cli.commands.quickstart.requests.get")
def test_wizard_ollama_not_running(mock_get, mock_int):
    mock_int.return_value = 1 # Ollama
    
    import requests
    mock_get.side_effect = requests.exceptions.RequestException("Connection refused")
    
    with pytest.raises(typer.Exit) as exc_info:
        quickstart_cmd()
    assert exc_info.value.exit_code == 1
