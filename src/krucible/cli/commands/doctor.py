"""Doctor command for environment checks."""
import sys
import typer

from krucible.cli.console import console
from krucible.cli.exit_codes import ExitCode

def doctor_cmd() -> None:
    """Check system environment and dependencies."""
    console.print("[bold]Krucible System Check[/bold]")
    
    # Check Python compatibility
    py_version = sys.version_info
    if py_version.major == 3 and py_version.minor >= 10:
        console.print(f"[green]✓[/green] Python {py_version.major}.{py_version.minor}.{py_version.micro} is supported.")
    else:
        console.print(f"[red]✗[/red] Python version {py_version.major}.{py_version.minor} is unsupported. Requires >= 3.10.")
        raise typer.Exit(ExitCode.GENERAL_ERROR)

    console.print("\n[bold green]System checks passed.[/bold green]")
