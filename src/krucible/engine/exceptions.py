"""Exceptions for the Evaluation Pipeline."""


class OrchestrationError(Exception):
    """Base exception for pipeline orchestration errors."""

    pass


class PipelineExecutionError(OrchestrationError):
    """Raised when an unrecoverable failure occurs during the orchestrated execution flow."""

    pass
