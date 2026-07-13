# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-13

### Added
- **Core CLI**: `krucible init`, `krucible test`, `krucible doctor`, and `krucible version`.
- **Domain Models**: Immutable `Attack`, `Policy`, `Evaluation`, and `Regression` models.
- **Evaluation Orchestrator**: Deterministic, state-free execution pipeline.
- **Regression Engine**: Drift detection using similarity matrices and tool usage tracking.
- **YAML File Loaders**: Configuration-driven execution without hardcoded python scripts.
- **Reporting Engine**: Extensible Strategy-pattern reporters generating Rich CLI and JSON artifacts.
- **Adapters**:
  - `MockAdapter` for zero-cost, network-free local testing and CI/CD validation.
  - `OpenAIAdapter` using the modern Responses SDK.
  - `GeminiAdapter` using the modern `google-genai` SDK.
- **Architecture**: Complete SOLID-compliant architecture ready for community plugin packs.
