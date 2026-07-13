"""Abstract interfaces for Target AI application adapters."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Tuple


class BaseAdapter(ABC):
    """
    Anti-Corruption Layer abstract interface.
    Normalizes communication with external AI frameworks.
    """

    @abstractmethod
    def execute(
        self, payload: str, context: Dict[str, Any] = None
    ) -> Tuple[str, float, Dict[str, Any]]:
        """
        Transmits the adversarial payload to the target.

        Args:
            payload: The final formatted attack string.
            context: Optional execution metadata.

        Returns:
            Tuple containing:
            - raw_response (str): The text output from the AI.
            - latency_ms (float): Execution time in milliseconds.
            - adapter_trace (Dict): Framework-specific telemetry (e.g. tool calls).
        """
        pass
