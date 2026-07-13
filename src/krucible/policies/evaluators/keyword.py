"""Keyword exact match policy evaluator strategy."""
from krucible.domain.enums import PolicyResultStatus
from krucible.domain.models import AttackResult, Policy, PolicyResult
from krucible.policies.interfaces import PolicyEvaluator
from krucible.policies.parser.rule_parser import extract_list_rule

class KeywordEvaluator(PolicyEvaluator):
    """Evaluates text against a set of exact substring matches."""
    
    def evaluate(self, policy: Policy, result: AttackResult) -> PolicyResult:
        keywords = extract_list_rule(policy.rules, "deny")
            
        for kw in keywords:
            if kw in result.raw_response:
                return PolicyResult(
                    policy_id=policy.id,
                    status=PolicyResultStatus.FAIL,
                    score=0.0,
                    reason=f"Matched forbidden keyword: '{kw}'"
                )
                
        return PolicyResult(
            policy_id=policy.id,
            status=PolicyResultStatus.PASS,
            score=1.0,
            reason="No forbidden keywords matched."
        )
