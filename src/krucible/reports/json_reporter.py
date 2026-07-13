"""JSON reporting strategy for CI/CD pipelines."""

from krucible.reports.exceptions import ReportGenerationError
from krucible.reports.interfaces import BaseReporter
from krucible.reports.models import ReportSummary


class JsonReporter(BaseReporter):
    """Generates machine-readable JSON output for automated CI systems."""

    def generate(self, summary: ReportSummary, **kwargs) -> str:
        try:
            return summary.model_dump_json(indent=2)
        except Exception as e:
            raise ReportGenerationError(f"Failed to generate JSON report: {str(e)}")
