"""Exceptions for the Policy Engine."""

class PolicyEngineError(Exception):
    """Base exception for policy engine errors."""
    pass

class UnknownPolicyTypeError(PolicyEngineError):
    """Raised when an unregistered policy type is encountered."""
    pass

class PolicyEvaluationError(PolicyEngineError):
    """Raised when an evaluator fails due to malformed rules or unexpected errors."""
    pass
