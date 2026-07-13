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
        console.print(
            f"[green][PASS][/green] Python {py_version.major}.{py_version.minor}.{py_version.micro} is supported."
        )
    else:
        console.print(
            f"[red]✗[/red] Python version {py_version.major}.{py_version.minor} is unsupported. Requires >= 3.10."
        )
        raise typer.Exit(ExitCode.GENERAL_ERROR)

    import os
    import sysconfig
    from pathlib import Path

    # Get global scripts path
    scripts_path = Path(sysconfig.get_path("scripts")).resolve()
    
    # Get user scripts path (where pip install --user installs to)
    try:
        user_scripts_path = Path(sysconfig.get_path("scripts", f"{os.name}_user")).resolve()
    except KeyError:
        import site
        user_scripts_path = Path(site.getuserbase()) / "Scripts" if os.name == "nt" else Path(site.getuserbase()) / "bin"
        user_scripts_path = user_scripts_path.resolve()

    env_path = [Path(p).resolve() for p in os.environ.get("PATH", "").split(os.pathsep) if p]

    missing_paths = []
    if scripts_path not in env_path:
        missing_paths.append(scripts_path)
    if user_scripts_path not in env_path:
        missing_paths.append(user_scripts_path)
    
    if not missing_paths:
        console.print(f"[green][PASS][/green] Python Scripts directories are in PATH.")
    elif user_scripts_path not in env_path:
        console.print(f"[yellow][WARN][/yellow] User Python Scripts directory is NOT in PATH.")
        console.print("       You may not be able to run `krucible` directly if installed without a virtual environment.")
        console.print(f"       [bold]Windows Fix:[/bold] [cyan]setx PATH \"%PATH%;{user_scripts_path}\"[/cyan]")
        console.print(f"       [bold]Unix Fix:[/bold]    [cyan]export PATH=\"$PATH:{user_scripts_path}\"[/cyan]")
    else:
        console.print(f"[green][PASS][/green] User Python Scripts directory is in PATH.")

    console.print("\n[bold green]System checks completed.[/bold green]")
