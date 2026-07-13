import typer
from rich.console import Console

app = typer.Typer(help="Krucible: AI Security Regression Testing Platform")
console = Console()

@app.callback(invoke_without_command=True)
def main():
    """
    Krucible CLI Entrypoint.
    """
    pass
