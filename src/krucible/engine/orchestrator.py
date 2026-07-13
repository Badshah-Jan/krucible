"""Core orchestration layer for the Evaluation Pipeline."""

from typing import List

from krucible.domain.enums import PolicyResultStatus
from krucible.domain.models import Attack, Evaluation, Policy
from krucible.engine.exceptions import PipelineExecutionError
from krucible.engine.interfaces import AttackRunnerProtocol, PolicyEngineProtocol


class EvaluationOrchestrator:
    """
    Stateless coordinator managing the execution flow.

    Adheres strictly to Dependency Inversion by relying on Protocols
    rather than concrete implementations. Contains absolutely no I/O, CLI,
    or formatting logic.
    """

    def __init__(
        self, attack_runner: AttackRunnerProtocol, policy_engine: PolicyEngineProtocol
    ):
        self.attack_runner = attack_runner
        self.policy_engine = policy_engine

    def evaluate_attack(self, attack: Attack, policies: List[Policy]) -> Evaluation:
        """
        Orchestrates the lifecycle of a single attack evaluation.

        Args:
            attack: The domain model defining the adversarial payload.
            policies: The list of security rules to enforce.

        Returns:
            Evaluation: The final, aggregated structured domain entity.
        """
        try:
            # 1. Execute the attack
            result = self.attack_runner.execute(attack)

            # 2. Evaluate the policies against the result
            policy_results = self.policy_engine.evaluate(policies, result)

            # 3. Aggregate final pass/fail status
            # (An evaluation passes only if ALL policies returned a PASS status)
            passed = all(pr.status == PolicyResultStatus.PASS for pr in policy_results)

            # 4. Construct the final immutable domain entity
            return Evaluation(
                attack=attack,
                result=result,
                policy_results=policy_results,
                passed=passed,
            )
        except Exception as e:
            # Wrap any unexpected execution crashes in a rigid domain exception
            raise PipelineExecutionError(
                f"Pipeline orchestration failed for attack '{attack.id}': {str(e)}"
            )
