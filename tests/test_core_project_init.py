"""Tests for the project initialization logic."""

import pytest

from krucible.core.project_init import (
    ProjectAlreadyInitializedError,
    ProjectInitializer,
)


def test_initialization_success(tmp_path):
    """Ensure directory and templates are created safely."""
    initializer = ProjectInitializer(root_dir=tmp_path)
    initializer.initialize()

    assert (tmp_path / "krucible.yml").exists()
    assert (tmp_path / ".krucible" / "policies" / "default.yml").exists()
    assert (tmp_path / ".krucible" / "baselines").is_dir()
    assert (tmp_path / ".krucible" / "attacks").is_dir()


def test_initialization_prevents_overwrite(tmp_path):
    """Ensure existing files trigger a safe abort."""
    (tmp_path / "krucible.yml").write_text("existing", encoding="utf-8")

    initializer = ProjectInitializer(root_dir=tmp_path)
    with pytest.raises(ProjectAlreadyInitializedError):
        initializer.initialize()

    # Assert data was never overwritten
    assert (tmp_path / "krucible.yml").read_text(encoding="utf-8") == "existing"
