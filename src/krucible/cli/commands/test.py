"""The main end-to-end test command for Krucible."""

import time
from pathlib import Path

import typer
from rich.console import Console

from krucible.adapters.gemini import GeminiAdapter
from krucible.adapters.mock import MockAdapter
from krucible.adapters.openai import OpenAIAdapter
from krucible.adapters.registry import AdapterRegistry
from krucible.attacks.payloads.strategies import (
    JailbreakStrategy,
    KeywordLeakageStrategy,
    PromptInjectionStrategy,
)
from krucible.attacks.registry import AttackRegistry
from krucible.attacks.runner import AttackRunner
from krucible.config.loader import ConfigLoader
from krucible.engine.orchestrator import EvaluationOrchestrator
from krucible.loaders.attack_loader import AttackLoader
from krucible.loaders.policy_loader import PolicyLoader
from krucible.policies.engine import PolicyEngine
from krucible.policies.evaluators.keyword import KeywordEvaluator
from krucible.policies.evaluators.regex import RegexEvaluator
from krucible.policies.registry import EvaluatorRegistry
from krucible.regression.baseline_store import LocalBaselineStore
from krucible.regression.comparator import (
    PolicyStatusComparator,
    SemanticDriftComparator,
    ToolUsageComparator,
)
from krucible.regression.regression_engine import RegressionEngine
from krucible.reports.cli_reporter import CliReporter
from krucible.reports.engine import ReportEngine
from krucible.reports.json_reporter import JsonReporter

console = Console()


def test_cmd(
    config_path: Path = typer.Option(
        Path("krucible.yml"), "--config", "-c", help="Path to krucible config file"
    ),
):
    """Executes the AI Security Regression Testing pipeline."""
    try:
        console.print(
            "[bold blue]Running AI Security Regression Tests...[/bold blue]\n"
        )

        # 1. Load Configuration
        config = ConfigLoader.load(config_path)
        console.print(
            f"[bold]Target:[/bold]\n{config.target.adapter.title()} {config.target.model}\n"
        )

        # 2. Wire up Dependency Registries
        adapter_reg = AdapterRegistry()
        adapter_reg.register("openai", OpenAIAdapter)
        adapter_reg.register(
            "mock", MockAdapter
        )  # Enabled strictly for CI/CD unit testing
        adapter_reg.register("gemini", GeminiAdapter)
        adapter = adapter_reg.get_adapter(
            config.target.adapter, model=config.target.model
        )

        attack_reg = AttackRegistry()
        attack_reg.register("injection", PromptInjectionStrategy())
        attack_reg.register("jailbreak", JailbreakStrategy())
        attack_reg.register("leakage", KeywordLeakageStrategy())

        runner = AttackRunner(registry=attack_reg, adapter=adapter)

        evaluator_reg = EvaluatorRegistry()
        evaluator_reg.register("regex", RegexEvaluator())
        evaluator_reg.register("keyword", KeywordEvaluator())

        policy_engine = PolicyEngine(registry=evaluator_reg)
        orchestrator = EvaluationOrchestrator(
            attack_runner=runner, policy_engine=policy_engine
        )

        # Setup the Core Regression Engine
        store = LocalBaselineStore(Path(".krucible/baselines"))
        reg_engine = RegressionEngine(
            store=store,
            comparators=[
                PolicyStatusComparator(),
                SemanticDriftComparator(config.regression.similarity_threshold),
                ToolUsageComparator(),
            ],
        )

        # 3. Load Configurations from Filesystem
        attack_loader = AttackLoader(Path(".krucible/attacks"))
        attacks = attack_loader.load_all(console=console)

        policy_loader = PolicyLoader(Path(".krucible/policies"))
        policies = policy_loader.load_all(console=console)

        if not attacks:
            console.print(
                "\n[yellow]No valid attacks discovered in .krucible/attacks. Exiting.[/yellow]"
            )
            raise typer.Exit(0)

        if not policies:
            console.print(
                "\n[yellow]No valid policies discovered in .krucible/policies. Exiting.[/yellow]"
            )
            raise typer.Exit(0)

        # Set up Report Strategies
        report_engine = ReportEngine()
        report_engine.register_reporter("cli", CliReporter())
        report_engine.register_reporter("json", JsonReporter())

        start_time = time.time()

        # 4. Orchestrate Evaluation Pipeline
        evaluations = []
        for atk in attacks:
            try:
                eval_res = orchestrator.evaluate_attack(atk, policies)
                evaluations.append(eval_res)
            except Exception as e:
                console.print(
                    f"[bold red]Error:[/bold red] Pipeline orchestration failed for attack '{atk.id}': {str(e)}"
                )
                raise typer.Exit(1)

        # 5. Detect Historical Regressions
        baseline_id = "default"
        try:
            regressions = reg_engine.detect_regressions(baseline_id, evaluations)
        except Exception:
            # If no baseline exists (first run), save it, then perform diff (which yields NO_REGRESSION)
            reg_engine.save_baseline(baseline_id, evaluations)
            regressions = reg_engine.detect_regressions(baseline_id, evaluations)

        duration_ms = (time.time() - start_time) * 1000.0

        # 6. Generate CI/CD Reports
        summary = report_engine.build_summary(
            evaluations=evaluations,
            regressions=regressions,
            target_adapter=config.target.adapter,
            target_model=config.target.model,
            duration_ms=duration_ms,
        )

        # Display to developer via Rich UI
        report_engine.generate("cli", summary, console=console)

        # Dump to machine-readable artifact for GitHub Actions / CI
        json_content = report_engine.generate("json", summary)
        report_engine.save_to_file(json_content, Path(".krucible/reports/latest.json"))

        exit_code = 1 if summary.failed > 0 or summary.regressions > 0 else 0
        console.print(f"Exit Code: {exit_code}")
        raise typer.Exit(exit_code)

    except typer.Exit as e:
        raise e
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        raise typer.Exit(1)
