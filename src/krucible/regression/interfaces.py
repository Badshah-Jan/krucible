"""Abstract interfaces for Regression Engine dependencies."""

from abc import ABC, abstractmethod
from typing import Optional

from krucible.domain.models import Baseline, Evaluation, Regression


class IComparator(ABC):
    """Strategy interface for detecting regressions between two evaluations."""

    @abstractmethod
    def compare(
        self, baseline_eval: Evaluation, current_eval: Evaluation
    ) -> Optional[Regression]:
        """
        Compare two evaluations to detect a regression.

        Returns:
            Regression: A structured entity if a drift or failure is detected.
            None: If the evaluations are mathematically identical or safe.
        """
        pass


class IBaselineStore(ABC):
    """Repository interface for persisting baselines."""

    @abstractmethod
    def save(self, baseline: Baseline) -> None:
        """Persist a baseline entity securely."""
        pass

    @abstractmethod
    def load(self, baseline_id: str) -> Baseline:
        """Retrieve a baseline entity by its unique identifier."""
        pass
