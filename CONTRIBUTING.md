# Contributing to Krucible

Thank you for investing your time in contributing to Krucible!

## Development Setup

1. Clone the repository.
2. Install in editable mode with development dependencies:
   ```bash
   pip install -e .[dev]
   ```
3. Run the tests:
   ```bash
   pytest tests/
   ```

## Architecture Philosophy

Krucible is built on **Clean Architecture** and **Domain-Driven Design**.
- **Do not mix business logic with CLI commands**.
- **All Core Models are Immutable** (`dataclasses(frozen=True)` or Pydantic `extra="forbid"`).
- **Use Dependency Injection**. Orchestrators should not instantiate Adapters directly.
- **Configuration-Driven**. Attacks and Policies must be defined in YAML, never inside Python code.

## Pull Request Process

1. Ensure all `pytest` suites pass.
2. Ensure `ruff check` and `ruff format` run cleanly.
3. Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
4. Update the `CHANGELOG.md` if necessary.

## Adding a New Adapter

To add a new AI Target Adapter:
1. Create `src/krucible/adapters/my_adapter.py`.
2. Inherit from `BaseAdapter`.
3. Register it in the `AdapterRegistry`.
4. Provide a Mocked unit test (never hit real APIs in the test suite).
