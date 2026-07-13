"""Schema validation for raw dictionaries against core Domain Models."""

from typing import Any, Dict

from pydantic import ValidationError

from krucible.domain.models import Attack, Policy
from krucible.loaders.exceptions import SchemaValidationError


class SchemaValidator:
    """Validates and casts raw dicts into strict frozen Domain Entities."""

    @staticmethod
    def validate_attack(data: Dict[str, Any], filename: str) -> Attack:
        try:
            return Attack(**data)
        except ValidationError as e:
            raise SchemaValidationError(f"Invalid Attack schema in '{filename}': {str(e)}")

    @staticmethod
    def validate_policy(data: Dict[str, Any], filename: str) -> Policy:
        try:
            return Policy(**data)
        except ValidationError as e:
            raise SchemaValidationError(f"Invalid Policy schema in '{filename}': {str(e)}")
