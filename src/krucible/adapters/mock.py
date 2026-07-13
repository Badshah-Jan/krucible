"""Mock adapter for deterministic local testing."""

from typing import Any, Dict, Tuple

from krucible.adapters.interfaces import BaseAdapter


class MockAdapter(BaseAdapter):
    """Simulates an AI application without requiring network calls."""

    def __init__(
        self,
        mock_response: str = "Mocked Response",
        mock_latency: float = 45.0,
        **kwargs,
    ):
        self.mock_response = mock_response
        self.mock_latency = mock_latency

    def execute(
        self, payload: str, context: Dict[str, Any] = None
    ) -> Tuple[str, float, Dict[str, Any]]:
        trace = {"mock_id": "mock-trace-99", "received_payload": payload}
        return self.mock_response, self.mock_latency, trace
