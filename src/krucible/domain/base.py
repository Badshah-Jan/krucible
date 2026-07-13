"""Base configuration for domain entities."""
from pydantic import BaseModel, ConfigDict

class DomainEntity(BaseModel):
    """
    Base class for all Krucible domain entities.
    
    Enforces absolute immutability and strict validation.
    Extra unknown fields are strictly forbidden to prevent payload smuggling.
    """
    model_config = ConfigDict(
        frozen=True,
        extra="forbid",
        validate_assignment=True
    )
