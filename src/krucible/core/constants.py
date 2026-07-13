"""Immutable constants and default templates."""

DEFAULT_CONFIG = """version: v1
target:
  adapter: openai
  model: gpt-4o

regression:
  similarity_threshold: 0.85
"""

DEFAULT_POLICY = """version: v1
policies:
  - id: prevent-pii
    type: regex
    rules:
      - deny: '\\b\\d{3}-\\d{2}-\\d{4}\\b'
"""
