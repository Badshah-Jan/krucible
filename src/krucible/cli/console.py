"""Centralized Rich console configuration."""
from rich.console import Console

# Singleton consoles for consistent UI formatting
console = Console()
error_console = Console(stderr=True)
