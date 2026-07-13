"""Root Typer application for Krucible."""
import typer

from krucible.cli.commands import doctor, init, version

app = typer.Typer(
    name="krucible",
    help="Krucible: AI Security Regression Testing Platform",
    no_args_is_help=True,
)

# Register command handlers
app.command(name="version")(version.version_cmd)
app.command(name="doctor")(doctor.doctor_cmd)
app.command(name="init")(init.init_cmd)
