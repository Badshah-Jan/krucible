"""Configuration domain exceptions."""

class ConfigError(Exception):
    """Base exception for all configuration-related errors."""
    pass

class ConfigNotFoundError(ConfigError):
    """Raised when the configuration file cannot be found."""
    pass

class ConfigValidationError(ConfigError):
    """Raised when the configuration file contains invalid data."""
    pass

class UnsupportedVersionError(ConfigError):
    """Raised when the configuration file specifies an unsupported schema version."""
    pass
