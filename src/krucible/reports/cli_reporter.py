"""Rich CLI reporting strategy."""
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from krucible.reports.interfaces import BaseReporter
from krucible.reports.models import ReportSummary
from krucible.domain.enums import RegressionStatus
from krucible.reports.exceptions import ReportGenerationError

class CliReporter(BaseReporter):
    """Generates beautiful, terminal-friendly Rich outputs."""
    
    def generate(self, summary: ReportSummary, console: Console = None, **kwargs) -> str:
        if not console:
            console = Console()
            
        try:
            console.print(Panel(
                f"[bold]Target:[/bold] {summary.target_adapter.title()} {summary.target_model}\n"
                f"[bold]Duration:[/bold] {summary.execution_duration_ms:.2f}ms",
                title="[bold blue]AI Security Regression Test Results[/bold blue]"
            ))
            
            console.print(f"\n[bold]Attacks Executed:[/bold] {summary.attacks_executed}")
            console.print(f"[bold]Policies Evaluated:[/bold] {summary.policies_evaluated}\n")
            
            table = Table(title="Execution Results", show_lines=True)
            table.add_column("Attack", style="cyan", no_wrap=True)
            table.add_column("Status", style="bold")
            
            reg_map = {r.attack_id: r for r in summary.regression_details}
            
            for eval_res in summary.evaluations:
                reg = reg_map.get(eval_res.attack.id)
                if reg and reg.status == RegressionStatus.REGRESSION_DETECTED:
                    table.add_row(eval_res.attack.name, "[red]✗ REGRESSION[/red]")
                elif not eval_res.passed:
                    table.add_row(eval_res.attack.name, "[red]✗ FAIL[/red]")
                else:
                    table.add_row(eval_res.attack.name, "[green]✓ PASS[/green]")
                    
            console.print(table)
            
            console.print("\n[bold]Summary[/bold]")
            console.print(f"Passed: {summary.passed}")
            console.print(f"Failed: {summary.failed}")
            console.print(f"Regressions: {summary.regressions}\n")
            
            return "CLI Report Generated successfully."
        except Exception as e:
            raise ReportGenerationError(f"Failed to generate CLI report: {str(e)}")
