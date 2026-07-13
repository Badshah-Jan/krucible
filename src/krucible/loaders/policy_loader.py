"""Loader for discovering and orchestrating Policy configurations."""

from pathlib import Path
from typing import List

from krucible.domain.models import Policy
from krucible.loaders.exceptions import DuplicateIdError
from krucible.loaders.parser import YamlParser
from krucible.loaders.validator import SchemaValidator


class PolicyLoader:
    """Discovers, parses, and securely yields Policy domain entities."""

    def __init__(self, directory: Path):
        self.directory = directory

    def load_all(self, console=None) -> List[Policy]:
        """Loads all .yml files in the directory. Skips invalid files gracefully."""
        if not self.directory.exists() or not self.directory.is_dir():
            if console:
                console.print(
                    f"[yellow]Warning: Policy directory '{self.directory}' not found.[/yellow]"
                )
            return []

        policies = []
        seen_ids = set()

        for file_path in self.directory.glob("**/*.yml"):
            try:
                data = YamlParser.parse(file_path)
                policy = SchemaValidator.validate_policy(data, file_path.name)

                if policy.id in seen_ids:
                    raise DuplicateIdError(
                        f"Duplicate Policy ID '{policy.id}' found in '{file_path.name}'."
                    )

                seen_ids.add(policy.id)
                policies.append(policy)
            except Exception as e:
                # Gracefully skip
                if console:
                    console.print(
                        f"[bold yellow]Skipping invalid policy file '{file_path.name}':[/bold yellow] {str(e)}"
                    )
                continue

        return policies
