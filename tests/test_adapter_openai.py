"""Tests for the OpenAI Adapter."""

import os
from unittest.mock import MagicMock, patch

import pytest

from krucible.adapters.openai import OpenAIAdapter
from krucible.attacks.exceptions import AttackExecutionError


@pytest.fixture
def mock_env_vars():
    """Injects a fake API key into the environment."""
    with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-mock-key-123"}):
        yield


def test_openai_adapter_missing_key_fails_securely():
    """Ensure adapter immediately fails initialization if the API key is missing."""
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            OpenAIAdapter(model="gpt-4o")


@patch("krucible.adapters.openai.OpenAI")
def test_openai_adapter_execution_success(mock_openai_class, mock_env_vars):
    """Ensure the adapter executes payloads using the new Responses API cleanly."""
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client

    # Construct a mocked response structurally identical to the Responses API
    mock_response = MagicMock()
    mock_response.output = ["Mocked responses API output content"]
    mock_response.id = "resp-123"
    mock_response.model = "o3-mini"
    mock_response.usage.model_dump.return_value = {
        "total_tokens": 15,
        "prompt_tokens": 5,
    }

    mock_client.responses.create.return_value = mock_response

    adapter = OpenAIAdapter(model="o3-mini")
    raw_content, latency, trace = adapter.execute(payload="Hello")

    assert "Mocked responses API output content" in raw_content
    assert latency >= 0
    assert trace["id"] == "resp-123"
    assert trace["model_used"] == "o3-mini"
    assert trace["usage"]["total_tokens"] == 15

    # Verify the internal client received the correct Responses API parameters
    mock_client.responses.create.assert_called_once_with(
        model="o3-mini", input="Hello", temperature=0.0
    )


@patch("krucible.adapters.openai.OpenAI")
def test_openai_adapter_reads_krucible_yml(mock_openai_class, mock_env_vars, tmp_path):
    """Ensure the adapter dynamically reads the target model from krucible.yml if omitted."""
    import yaml

    config_path = tmp_path / "krucible.yml"
    config_path.write_text(
        yaml.dump(
            {"version": "v1", "target": {"adapter": "openai", "model": "gpt-5.1"}}
        ),
        encoding="utf-8",
    )

    with patch("krucible.adapters.openai.Path.cwd", return_value=tmp_path):
        adapter = OpenAIAdapter(model=None)
        assert adapter.model == "gpt-5.1"


@patch("krucible.adapters.openai.OpenAI")
def test_openai_adapter_handles_api_errors(mock_openai_class, mock_env_vars):
    """Ensure OpenAI-specific SDK errors are safely wrapped in the domain AttackExecutionError."""
    from krucible.adapters.openai import OpenAIError

    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    mock_client.responses.create.side_effect = OpenAIError("Rate limit exceeded")

    adapter = OpenAIAdapter(model="gpt-4o")

    with pytest.raises(AttackExecutionError, match="Rate limit exceeded"):
        adapter.execute(payload="Attempt Attack")
