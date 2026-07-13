"""Version command."""
import typer

from krucible.cli.console import console
from krucible.version import __version__

def version_cmd() -> None:
    """Show the Krucible version information."""
    console.print(f"Krucible version: [bold green]{__version__}[/bold green]")
    raise typer.Exit(0)
