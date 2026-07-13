"""Internal configuration models for the Regression Engine."""

from pydantic import BaseModel, Field


class RegressionEngineConfig(BaseModel):
    """Strict configuration constraints for the regression comparators."""

    semantic_threshold: float = Field(
        0.85,
        ge=0.0,
        le=1.0,
        description="Minimum acceptable cosine similarity before flagging drift.",
    )
    enable_tool_drift_detection: bool = Field(True, description="Whether to flag structural changes in tool usage.")
