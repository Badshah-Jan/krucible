"""Pydantic models representing the configuration schema."""

from typing import List

from pydantic import BaseModel, Field, field_validator


class TargetConfig(BaseModel):
    """Configuration for the target AI application."""

    adapter: str = Field(
        ..., description="The adapter to use (e.g., openai, langchain)"
    )
    model: str = Field(..., description="The target LLM model")


class RegressionConfig(BaseModel):
    """Configuration for the regression engine."""

    similarity_threshold: float = Field(
        0.85,
        description="Cosine similarity threshold for semantic diffing",
        ge=0.0,
        le=1.0,
    )


class ProjectConfig(BaseModel):
    """Basic project metadata."""

    name: str = Field("Krucible Project", description="Name of the project")


class KrucibleConfig(BaseModel):
    """Root configuration object for Krucible."""

    version: str = Field(..., description="Configuration schema version")
    project: ProjectConfig = Field(default_factory=ProjectConfig)
    target: TargetConfig
    regression: RegressionConfig = Field(default_factory=RegressionConfig)
    plugins: List[str] = Field(
        default_factory=list, description="List of active plugins"
    )

    @field_validator("version")
    @classmethod
    def validate_version(cls, v: str) -> str:
        """Ensure the configuration version is supported."""
        if v != "v1":
            raise ValueError(
                f"Unsupported configuration version: '{v}'. Expected 'v1'."
            )
        return v
