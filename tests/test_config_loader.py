"""Tests for the configuration system."""
import pytest
import yaml
from pathlib import Path

from krucible.config.loader import ConfigLoader
from krucible.config.models import KrucibleConfig
from krucible.config.exceptions import ConfigNotFoundError, ConfigValidationError, UnsupportedVersionError

def test_load_valid_config(tmp_path: Path):
    """Ensure a valid configuration is parsed correctly and defaults are set."""
    config_file = tmp_path / "krucible.yml"
    data = {
        "version": "v1",
        "target": {
            "adapter": "openai",
            "model": "gpt-4"
        },
        "regression": {
            "similarity_threshold": 0.90
        }
    }
    with open(config_file, "w", encoding="utf-8") as f:
        yaml.dump(data, f)

    config = ConfigLoader.load(config_file)
    assert isinstance(config, KrucibleConfig)
    assert config.version == "v1"
    assert config.target.adapter == "openai"
    assert config.target.model == "gpt-4"
    assert config.regression.similarity_threshold == 0.90
    assert config.project.name == "Krucible Project"  # Testing default initialization

def test_load_missing_file(tmp_path: Path):
    """Ensure a missing file raises ConfigNotFoundError."""
    missing_file = tmp_path / "missing.yml"
    with pytest.raises(ConfigNotFoundError):
        ConfigLoader.load(missing_file)

def test_load_invalid_yaml(tmp_path: Path):
    """Ensure malformed YAML securely raises ConfigValidationError."""
    config_file = tmp_path / "krucible.yml"
    config_file.write_text("unclosed: [ yaml", encoding="utf-8")
    
    with pytest.raises(ConfigValidationError):
        ConfigLoader.load(config_file)

def test_load_unsupported_version(tmp_path: Path):
    """Ensure an unsupported version explicitly raises UnsupportedVersionError."""
    config_file = tmp_path / "krucible.yml"
    data = {
        "version": "v2",
        "target": {"adapter": "openai", "model": "gpt-4"}
    }
    with open(config_file, "w", encoding="utf-8") as f:
        yaml.dump(data, f)

    with pytest.raises(UnsupportedVersionError):
        ConfigLoader.load(config_file)

def test_load_invalid_schema(tmp_path: Path):
    """Ensure missing required fields strictly raises ConfigValidationError."""
    config_file = tmp_path / "krucible.yml"
    data = {
        "version": "v1",
        # Missing 'target' block entirely, which is strictly required
    }
    with open(config_file, "w", encoding="utf-8") as f:
        yaml.dump(data, f)

    with pytest.raises(ConfigValidationError):
        ConfigLoader.load(config_file)
