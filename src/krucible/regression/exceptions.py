"""Regression domain exceptions."""

class RegressionError(Exception):
    """Base exception for regression engine errors."""
    pass

class BaselineNotFoundError(RegressionError):
    """Raised when a requested baseline ID does not exist."""
    pass

class BaselineStorageError(RegressionError):
    """Raised when I/O fails during baseline persistence."""
    pass

class ComparisonError(RegressionError):
    """Raised when a comparator strategy fails to compute a diff."""
    pass
