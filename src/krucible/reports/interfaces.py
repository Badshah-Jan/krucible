"""Base interface for all reporting strategies."""

from abc import ABC, abstractmethod

from krucible.reports.models import ReportSummary


class BaseReporter(ABC):
    """Strategy interface for formatting Krucible Report Summaries."""

    @abstractmethod
    def generate(self, summary: ReportSummary, **kwargs) -> str:
        """Transforms a strongly typed ReportSummary into a final serialized format."""
        pass
