"""Extracts and normalizes primitive structures from raw policy dictionaries."""

from typing import Any, Dict, List

from krucible.policies.exceptions import PolicyEvaluationError


def extract_list_rule(rules: Dict[str, Any], key: str, default: List[str] = None) -> List[str]:
    """
    Safely extracts and coerces a list of strings from a policy rule dictionary.
    """
    if default is None:
        default = []

    val = rules.get(key, default)
    if isinstance(val, str):
        return [val]
    if isinstance(val, list):
        if not all(isinstance(x, str) for x in val):
            raise PolicyEvaluationError(f"Rule '{key}' must contain strictly strings.")
        return val

    raise PolicyEvaluationError(f"Rule '{key}' must be a string or a list of strings.")
