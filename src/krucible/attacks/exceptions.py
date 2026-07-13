"""Attack domain exceptions."""

class AttackError(Exception):
    """Base exception for attack-related errors."""
    pass

class UnknownAttackTypeError(AttackError):
    """Raised when an unregistered attack strategy is requested."""
    pass

class AttackExecutionError(AttackError):
    """Raised when an attack fails to execute against the target adapter."""
    pass
