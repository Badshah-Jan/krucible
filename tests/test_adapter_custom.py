import os
from unittest.mock import patch, MagicMock
import pytest
from krucible.adapters.custom import CustomRestAdapter

@pytest.fixture
def clean_env():
    # Store old env
    old_env = dict(os.environ)
    # Clear specific vars
    os.environ.pop("KRUCIBLE_CUSTOM_URL", None)
    os.environ.pop("KRUCIBLE_CUSTOM_PAYLOAD_KEY", None)
    os.environ.pop("KRUCIBLE_CUSTOM_OUTPUT_KEY", None)
    yield
    # Restore old env
    os.environ.clear()
    os.environ.update(old_env)

def test_custom_adapter_default_fallback(clean_env):
    os.environ["KRUCIBLE_CUSTOM_URL"] = "http://localhost:8000"
    adapter = CustomRestAdapter()
    
    # Not JSON
    assert adapter._extract_output("Plain text response") == "Plain text response"
    
    # JSON but no common keys
    assert adapter._extract_output('{"unknown": "data"}') == '{"unknown": "data"}'

def test_custom_adapter_auto_detect_common_keys(clean_env):
    os.environ["KRUCIBLE_CUSTOM_URL"] = "http://localhost:8000"
    adapter = CustomRestAdapter()
    
    # Auto-detect "response"
    assert adapter._extract_output('{"response": "Extracted", "other": "ignore"}') == "Extracted"
    
    # Auto-detect "message"
    assert adapter._extract_output('{"message": "Hello World"}') == "Hello World"

def test_custom_adapter_explicit_output_key(clean_env):
    os.environ["KRUCIBLE_CUSTOM_URL"] = "http://localhost:8000"
    os.environ["KRUCIBLE_CUSTOM_OUTPUT_KEY"] = "data.message"
    adapter = CustomRestAdapter()
    
    json_str = '{"data": {"message": "Deeply nested", "reasoning": "hacked"}}'
    assert adapter._extract_output(json_str) == "Deeply nested"

    # Missing key returns full JSON
    missing_json_str = '{"data": {"other": "value"}}'
    assert adapter._extract_output(missing_json_str) == missing_json_str

@patch("krucible.adapters.custom.requests.post")
def test_custom_adapter_execute(mock_post, clean_env):
    os.environ["KRUCIBLE_CUSTOM_URL"] = "http://localhost:8000"
    os.environ["KRUCIBLE_CUSTOM_PAYLOAD_KEY"] = "input"
    os.environ["KRUCIBLE_CUSTOM_OUTPUT_KEY"] = "output"
    
    adapter = CustomRestAdapter()
    
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = '{"output": "Clean Response", "reasoning": "hacked"}'
    mock_post.return_value = mock_resp
    
    result, latency, trace = adapter.execute("Hello")
    
    # Assert extracted response
    assert result == "Clean Response"
    
    # Assert trace has full data
    assert trace["http_response"]["status_code"] == 200
    assert "hacked" in trace["http_response"]["body"]
    assert trace["http_request"]["body"] == {"input": "Hello"}
