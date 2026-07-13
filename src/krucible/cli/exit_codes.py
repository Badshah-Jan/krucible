"""Centralized exit codes for the Krucible CLI."""

from enum import IntEnum


class ExitCode(IntEnum):
    """Standardized POSIX-compliant exit codes."""

    SUCCESS = 0
    GENERAL_ERROR = 1
    CONFIG_ERROR = 2
    VALIDATION_ERROR = 3
    REGRESSION_DETECTED = 4
