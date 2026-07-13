"""Domain exceptions for filesystem loaders."""


class LoaderError(Exception):
    """Base exception for all loading errors."""

    pass


class FileParseError(LoaderError):
    """Raised when a YAML file contains invalid syntax."""

    pass


class SchemaValidationError(LoaderError):
    """Raised when a YAML file fails Pydantic schema validation."""

    pass


class DuplicateIdError(LoaderError):
    """Raised when two files define the exact same domain entity ID."""

    pass
