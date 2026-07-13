"""Domain enumerations."""
from enum import Enum

class PolicyResultStatus(str, Enum):
    """The outcome of a policy evaluation."""
    PASS = "PASS"
    FAIL = "FAIL"
    ERROR = "ERROR"

class RegressionStatus(str, Enum):
    """The delta state of a test execution compared to a baseline."""
    NO_REGRESSION = "NO_REGRESSION"
    REGRESSION_DETECTED = "REGRESSION_DETECTED"
    IMPROVEMENT = "IMPROVEMENT"
    ERROR = "ERROR"
