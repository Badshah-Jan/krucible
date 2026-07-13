"""Project initialization service."""

from pathlib import Path

from krucible.core.constants import DEFAULT_CONFIG, DEFAULT_POLICY


class ProjectAlreadyInitializedError(Exception):
    """Raised when the workspace already exists to prevent malicious overwrites."""

    pass


class ProjectInitializer:
    """Securely handles the creation of the Krucible workspace."""

    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.krucible_dir = self.root_dir / ".krucible"
        self.config_file = self.root_dir / "krucible.yml"

    def initialize(self) -> None:
        """
        Initialize the directory structure safely.

        Raises:
            ProjectAlreadyInitializedError: If state already exists.
        """
        if self.config_file.exists() or self.krucible_dir.exists():
            raise ProjectAlreadyInitializedError("Krucible is already initialized in this directory.")

        directories = [
            self.krucible_dir / "policies",
            self.krucible_dir / "attacks",
            self.krucible_dir / "baselines",
            self.krucible_dir / "reports",
            self.krucible_dir / "cache",
        ]

        # Securely create directories (creates missing parents safely)
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

        self.config_file.write_text(DEFAULT_CONFIG, encoding="utf-8")

        policy_file = self.krucible_dir / "policies" / "default.yml"
        policy_file.write_text(DEFAULT_POLICY, encoding="utf-8")
