"""Init command."""

import os
from pathlib import Path

import typer

from krucible.cli.console import console
from krucible.cli.exit_codes import ExitCode
from krucible.core.project_init import (
    ProjectAlreadyInitializedError,
    ProjectInitializer,
)


def init_cmd() -> None:
    """Initialize a new Krucible project workspace."""
    cwd = Path(os.getcwd())
    initializer = ProjectInitializer(root_dir=cwd)

    try:
        initializer.initialize()
        console.print(
            "[bold green]Successfully initialized Krucible project.[/bold green]"
        )
        console.print(f"Created configuration at: [bold]{cwd / 'krucible.yml'}[/bold]")
        console.print(f"Created workspace at: [bold]{cwd / '.krucible'}[/bold]")
    except ProjectAlreadyInitializedError as e:
        console.print(f"[yellow]Warning: {str(e)}[/yellow]")
        console.print("Initialization aborted safely.")
        raise typer.Exit(ExitCode.SUCCESS)
    except Exception as e:
        console.print(f"[red]Fatal error during initialization: {str(e)}[/red]")
        raise typer.Exit(ExitCode.GENERAL_ERROR)
