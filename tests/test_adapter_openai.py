"""Tests for the OpenAI Adapter."""
import os
import pytest
from unittest.mock import patch, MagicMock

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
            OpenAIAdapter(model="gpt-4")

@patch("krucible.adapters.openai.OpenAI")
def test_openai_adapter_execution_success(mock_openai_class, mock_env_vars):
    """Ensure the adapter executes payloads and standardizes the telemetry cleanly."""
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    
    # Construct a mocked response structurally identical to the real OpenAI SDK
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "I am a helpful assistant."
    mock_response.id = "chatcmpl-123"
    mock_response.model = "gpt-4-0613"
    mock_response.usage.model_dump.return_value = {"total_tokens": 15, "prompt_tokens": 5}
    
    mock_client.chat.completions.create.return_value = mock_response
    
    adapter = OpenAIAdapter(model="gpt-4")
    raw_content, latency, trace = adapter.execute(payload="Hello")
    
    assert raw_content == "I am a helpful assistant."
    assert latency >= 0
    assert trace["id"] == "chatcmpl-123"
    assert trace["model_used"] == "gpt-4-0613"
    assert trace["usage"]["total_tokens"] == 15
    
    # Verify the internal client received the correct rigid payload format
    mock_client.chat.completions.create.assert_called_once_with(
        model="gpt-4",
        messages=[{"role": "user", "content": "Hello"}],
        temperature=0.0
    )

@patch("krucible.adapters.openai.OpenAI")
def test_openai_adapter_handles_api_errors(mock_openai_class, mock_env_vars):
    """Ensure OpenAI-specific SDK errors are safely wrapped in the domain AttackExecutionError."""
    from krucible.adapters.openai import OpenAIError
    
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = OpenAIError("Rate limit exceeded")
    
    adapter = OpenAIAdapter(model="gpt-4")
    
    with pytest.raises(AttackExecutionError, match="Rate limit exceeded"):
        adapter.execute(payload="Attempt Attack")
