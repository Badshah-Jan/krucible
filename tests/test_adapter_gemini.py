"""Tests for the Gemini Adapter."""

import os
from unittest.mock import MagicMock, patch

import pytest

from krucible.adapters.gemini import GeminiAdapter


@pytest.fixture
def mock_env_vars():
    """Injects a fake API key into the environment."""
    with patch.dict(os.environ, {"Gemini_API_KEY": "sk-test-mock-key-123"}):
        yield


def test_gemini_adapter_missing_key_fails_securely():
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="Gemini_API_KEY"):
            GeminiAdapter(model="gemini-2.0-flash")


@patch("krucible.adapters.gemini.genai")
def test_gemini_adapter_execution_success(mock_genai_class, mock_env_vars):
    mock_client = MagicMock()
    mock_genai_class.Client.return_value = mock_client

    mock_response = MagicMock()
    type(mock_response).text = "I am a helpful assistant."
    mock_client.models.generate_content.return_value = mock_response

    adapter = GeminiAdapter(model="gemini-2.0-flash")
    raw_content, latency, trace = adapter.execute(payload="Hello")

    assert raw_content == "I am a helpful assistant."
    assert latency >= 0
    assert trace["model_used"] == "gemini-2.0-flash"
