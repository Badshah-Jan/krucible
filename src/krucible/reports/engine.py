"""Orchestrator for managing Report Strategies."""
from typing import Dict, List
from pathlib import Path
from datetime import datetime

from krucible.domain.models import Evaluation, Regression
from krucible.domain.enums import RegressionStatus
from krucible.reports.interfaces import BaseReporter
from krucible.reports.models import ReportSummary
from krucible.reports.exceptions import ReportGenerationError

class ReportEngine:
    """Manages routing of domain entities into multiple output artifacts."""
    
    def __init__(self):
        self.reporters: Dict[str, BaseReporter] = {}
        
    def register_reporter(self, name: str, reporter: BaseReporter):
        self.reporters[name] = reporter
        
    def build_summary(
        self,
        evaluations: List[Evaluation],
        regressions: List[Regression],
        target_adapter: str,
        target_model: str,
        duration_ms: float
    ) -> ReportSummary:
        """Aggregates execution results into a unified CI/CD ready schema."""
        passed = sum(1 for e in evaluations if e.passed)
        failed = len(evaluations) - passed
        reg_count = sum(1 for r in regressions if r.status == RegressionStatus.REGRESSION_DETECTED)
        
        policies_evaluated = len(evaluations[0].policy_results) if evaluations else 0
        
        return ReportSummary(
            timestamp=datetime.utcnow(),
            target_adapter=target_adapter,
            target_model=target_model,
            attacks_executed=len(evaluations),
            policies_evaluated=policies_evaluated,
            passed=passed,
            failed=failed,
            regressions=reg_count,
            execution_duration_ms=duration_ms,
            evaluations=evaluations,
            regression_details=regressions
        )

    def generate(self, format_name: str, summary: ReportSummary, **kwargs) -> str:
        """Generates the report via the chosen strategy."""
        reporter = self.reporters.get(format_name)
        if not reporter:
            raise ReportGenerationError(f"Reporter format '{format_name}' is not registered.")
        return reporter.generate(summary, **kwargs)
        
    def save_to_file(self, content: str, path: Path):
        """Writes report to disk."""
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        except OSError as e:
            raise ReportGenerationError(f"Failed to save report to {path}: {str(e)}")
