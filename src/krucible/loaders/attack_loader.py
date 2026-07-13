"""Loader for discovering and orchestrating Attack configurations."""

from pathlib import Path
from typing import List

from krucible.domain.models import Attack
from krucible.loaders.exceptions import DuplicateIdError
from krucible.loaders.parser import YamlParser
from krucible.loaders.validator import SchemaValidator


class AttackLoader:
    """Discovers, parses, and securely yields Attack domain entities."""

    def __init__(self, directory: Path):
        self.directory = directory

    def load_all(self, console=None) -> List[Attack]:
        """Loads all .yml files in the directory. Skips invalid files gracefully."""
        if not self.directory.exists() or not self.directory.is_dir():
            if console:
                console.print(
                    f"[yellow]Warning: Attack directory '{self.directory}' not found.[/yellow]"
                )
            return []

        attacks = []
        seen_ids = set()

        for file_path in self.directory.glob("**/*.yml"):
            try:
                data = YamlParser.parse(file_path)
                attack = SchemaValidator.validate_attack(data, file_path.name)

                if attack.id in seen_ids:
                    raise DuplicateIdError(
                        f"Duplicate Attack ID '{attack.id}' found in '{file_path.name}'."
                    )

                seen_ids.add(attack.id)
                attacks.append(attack)
            except Exception as e:
                # Gracefully skip the file to prevent crashing the entire execution pipeline
                if console:
                    console.print(
                        f"[bold yellow]Skipping invalid attack file '{file_path.name}':[/bold yellow] {str(e)}"
                    )
                continue

        return attacks
