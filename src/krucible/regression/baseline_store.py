"""Secure file-system persistence for Krucible Baselines."""

from pathlib import Path

from krucible.domain.models import Baseline
from krucible.regression.exceptions import BaselineNotFoundError, BaselineStorageError
from krucible.regression.interfaces import IBaselineStore


class LocalBaselineStore(IBaselineStore):
    """
    Handles local filesystem storage of Baselines.
    Leverages Pydantic's robust JSON serialization for immutable state persistence.
    """

    def __init__(self, storage_dir: Path):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def save(self, baseline: Baseline) -> None:
        file_path = self.storage_dir / f"{baseline.id}.json"
        try:
            # Safely serialize deep domain graphs to JSON string
            data = baseline.model_dump_json(indent=2)
            file_path.write_text(data, encoding="utf-8")
        except Exception as e:
            raise BaselineStorageError(
                f"Failed to persist baseline '{baseline.id}': {str(e)}"
            )

    def load(self, baseline_id: str) -> Baseline:
        file_path = self.storage_dir / f"{baseline_id}.json"
        if not file_path.exists():
            raise BaselineNotFoundError(
                f"Baseline '{baseline_id}' does not exist at '{file_path}'."
            )

        try:
            data = file_path.read_text(encoding="utf-8")
            # Enforce rigid schema validation upon loading
            return Baseline.model_validate_json(data)
        except Exception as e:
            raise BaselineStorageError(
                f"Failed to deserialize baseline '{baseline_id}': {str(e)}"
            )
