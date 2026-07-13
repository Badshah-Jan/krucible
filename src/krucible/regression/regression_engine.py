"""Core Regression Engine Orchestrator."""

from datetime import datetime, timezone
from typing import Dict, List

from krucible.domain.enums import RegressionStatus
from krucible.domain.models import Baseline, Evaluation, Regression
from krucible.regression.interfaces import IBaselineStore, IComparator


class RegressionEngine:
    """
    Orchestrates the detection of security regressions by chaining
    independent Comparison strategies against a persisted Baseline.
    """

    def __init__(self, store: IBaselineStore, comparators: List[IComparator]):
        self.store = store
        self.comparators = comparators

    def save_baseline(
        self,
        baseline_id: str,
        evaluations: List[Evaluation],
        metadata: Dict[str, str] = None,
    ) -> Baseline:
        """Constructs an immutable Baseline entity and persists it via the injected store."""
        baseline = Baseline(
            id=baseline_id,
            created_at=datetime.now(timezone.utc),
            evaluations=evaluations,
            metadata=metadata or {},
        )
        self.store.save(baseline)
        return baseline

    def detect_regressions(self, baseline_id: str, current_evals: List[Evaluation]) -> List[Regression]:
        """
        Calculates diffs across all current evaluations against the stored truth.
        """
        baseline = self.store.load(baseline_id)

        # O(1) mapping of historical truth by attack payload ID
        b_map = {e.attack.id: e for e in baseline.evaluations}

        regressions = []
        for current_eval in current_evals:
            attack_id = current_eval.attack.id
            if attack_id not in b_map:
                # Completely new attack added to suite; cannot mathematically regress.
                continue

            b_eval = b_map[attack_id]

            # Execute all comparator strategies in the pipeline
            detected = False
            for comp in self.comparators:
                reg = comp.compare(b_eval, current_eval)
                if reg:
                    regressions.append(reg)
                    detected = True
                    break  # Halt at the first severe regression indicator to prevent alert noise

            # If no strategy flagged a violation, enforce the NO_REGRESSION status explicitly
            if not detected:
                regressions.append(
                    Regression(
                        attack_id=attack_id,
                        status=RegressionStatus.NO_REGRESSION,
                        semantic_drift_score=1.0,
                        details="Execution explicitly matches baseline security guarantees.",
                    )
                )

        return regressions
