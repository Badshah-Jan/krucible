"""Abstract interfaces for Attack strategies."""

from abc import ABC, abstractmethod

from krucible.domain.models import Attack


class AttackStrategy(ABC):
    """
    Strategy pattern interface for generating adversarial payloads.
    Allows for dynamic formulation of prompt injections, jailbreaks, etc.
    """

    @abstractmethod
    def prepare_payload(self, attack: Attack) -> str:
        """
        Transforms the base attack domain model into a finalized executable string.
        """
        pass
