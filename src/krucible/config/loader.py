"""Configuration loader for parsing krucible.yml."""
from pathlib import Path
import yaml
from pydantic import ValidationError

from krucible.config.models import KrucibleConfig
from krucible.config.exceptions import ConfigNotFoundError, ConfigValidationError, UnsupportedVersionError

class ConfigLoader:
    """Securely loads and validates Krucible configuration from disk."""

    @staticmethod
    def load(config_path: Path) -> KrucibleConfig:
        """
        Load a YAML configuration file into strongly-typed domain models.
        
        Args:
            config_path: Path to the krucible.yml file.
            
        Raises:
            ConfigNotFoundError: If the file does not exist.
            ConfigValidationError: If the schema is invalid or malformed YAML.
            UnsupportedVersionError: If the version is not supported.
        """
        if not config_path.exists() or not config_path.is_file():
            raise ConfigNotFoundError(f"Configuration file not found at: {config_path}")

        try:
            with open(config_path, "r", encoding="utf-8") as f:
                raw_data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            raise ConfigValidationError(f"Invalid YAML syntax: {str(e)}")

        if not isinstance(raw_data, dict):
            raise ConfigValidationError("Configuration must be a valid YAML dictionary mapping.")

        try:
            return KrucibleConfig(**raw_data)
        except ValidationError as e:
            # Dynamically check if the failure was specifically due to an unsupported version
            for error in e.errors():
                if "version" in error.get("loc", []) and "Unsupported" in str(error.get("msg", "")):
                    raise UnsupportedVersionError(error["msg"])
            raise ConfigValidationError(f"Configuration validation failed:\n{e}")
