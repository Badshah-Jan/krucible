"""Domain models for reporting data transfer."""

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from krucible.domain.models import Evaluation, Regression


class ReportSummary(BaseModel):
    """Strict schema dictating the structure of all exported CI/CD reports."""

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    target_adapter: str
    target_model: str
    attacks_executed: int
    policies_evaluated: int
    passed: int
    failed: int
    regressions: int
    execution_duration_ms: float
    evaluations: List[Evaluation]
    regression_details: List[Regression]
