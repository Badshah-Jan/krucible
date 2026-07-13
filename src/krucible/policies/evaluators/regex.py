"""Regular Expression policy evaluator strategy."""
import re
from typing import Dict, Pattern

from krucible.domain.enums import PolicyResultStatus
from krucible.domain.models import AttackResult, Policy, PolicyResult
from krucible.policies.interfaces import PolicyEvaluator
from krucible.policies.exceptions import PolicyEvaluationError
from krucible.policies.parser.rule_parser import extract_list_rule

class RegexEvaluator(PolicyEvaluator):
    """Evaluates text against pre-compiled regex rules."""
    
    def __init__(self):
        # Cache compiled regex patterns by policy_id to avoid recompiling per request
        self._compiled_cache: Dict[str, list[Pattern]] = {}

    def _compile(self, policy: Policy) -> list[Pattern]:
        if policy.id in self._compiled_cache:
            return self._compiled_cache[policy.id]
            
        rules = extract_list_rule(policy.rules, "deny")
        try:
            compiled = [re.compile(r) for r in rules]
            self._compiled_cache[policy.id] = compiled
            return compiled
        except re.error as e:
            raise PolicyEvaluationError(f"Invalid regex in policy '{policy.id}': {e}")

    def evaluate(self, policy: Policy, result: AttackResult) -> PolicyResult:
        compiled_rules = self._compile(policy)
        
        for pattern in compiled_rules:
            if pattern.search(result.raw_response):
                return PolicyResult(
                    policy_id=policy.id,
                    status=PolicyResultStatus.FAIL,
                    score=0.0,
                    reason=f"Matched forbidden regex pattern: {pattern.pattern}"
                )
                
        return PolicyResult(
            policy_id=policy.id,
            status=PolicyResultStatus.PASS,
            score=1.0,
            reason="No forbidden regex patterns matched."
        )
