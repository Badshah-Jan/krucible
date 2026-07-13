<div align="center">

# 🛡️ Krucible

**The Configuration-Driven AI Security Regression Testing Platform**

[![CI](https://github.com/badshahjan123/Neighborly/actions/workflows/ci.yml/badge.svg)](https://github.com/badshahjan123/Neighborly/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-v0.1.0-blue.svg)](https://github.com/badshahjan123/Neighborly)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## 📖 Overview

**Krucible** is a production-grade regression testing platform designed explicitly for Large Language Models and AI applications. As AI models update dynamically, their safety guardrails frequently drift. What was secure yesterday might leak PII today.

Krucible automates **AI Security Regression Testing**. It executes adversarial payloads (Prompt Injections, Jailbreaks) against your AI models, evaluates the outputs against strict security policies, and calculates semantic drift across CI/CD pipeline runs.

### Why Krucible Exists

Traditional testing tools calculate binary JSON or text diffs. AI requires semantic evaluation. 
Krucible completely separates the execution engine from the security payloads. Developers build the pipelines; Security Researchers write the YAML payloads. 

## ✨ Features

- **Configuration-Driven**: Zero Python modifications required. Define attacks and policies purely in `.yml` files.
- **Engine Orchestration**: Robust Dependency Injection architecture executing complex multi-stage evaluations securely.
- **Regression Detection**: Tracks policy flips, semantic similarity drifts, and tool-usage deviations.
- **Three Testing Journeys**: 
  1. **AI Providers**: Direct testing of foundation models (`OpenAI`, `Anthropic`, `Gemini`, `OpenRouter`, `Groq`, `Ollama`).
  2. **AI Applications**: Test your deployed custom APIs. Krucible attempts to auto-detect payload structure (JSON input and output mapping), with manual override available.
  3. **Native Python Agents**: Hook directly into un-deployed frameworks (`LangChain`, `CrewAI`, `FastAPI`).
- **CI/CD Ready**: Generates strictly-typed machine-readable JSON artifacts and beautiful Rich terminal outputs with deterministic exit codes.

## 🚀 Quick Start

### Installation

Install Krucible via pip:

```bash
pip install krucible
```

### Initialization & Onboarding

Set up a new Krucible project using the interactive wizard:

```bash
python -m krucible quickstart
```

This journey-based wizard will guide you through testing an AI Provider, a custom AI Application, or a Native AI Agent, attempting to auto-detect structures where possible.

### Running Tests

Execute your security regression test suite:

```bash
krucible test
```

*Output:*
```text
╭─────────────────────────────── AI Security Regression Test Results ────────────────────────────────╮
│ Target: Custom custom                                                                              │
│ Duration: 1250.00ms                                                                                │
╰────────────────────────────────────────────────────────────────────────────────────────────────────╯

Attacks Executed: 2
Policies Evaluated: 2

      Execution Results       
┏━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┓
┃ Attack            ┃ Status       ┃
┡━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━┩
│ Prompt Injection  │ [FAIL]       │
├───────────────────┼──────────────┤
│ Ignore Guardrails │ [PASS]       │
└───────────────────┴──────────────┘

Summary
Passed: 1
Failed: 1
Regressions: 0

Exit Code: 1
```

## ⚙️ Configuration

Your `krucible.yml` controls the orchestrator targeting.

### OpenAI Example
```yaml
version: v1
target:
  adapter: openai
  model: gpt-4o
regression:
  similarity_threshold: 0.85
```

### Custom REST API Example
```yaml
version: v1
target:
  adapter: custom
  model: custom
regression:
  similarity_threshold: 0.85
```
*(Requires `KRUCIBLE_CUSTOM_URL`, `KRUCIBLE_CUSTOM_PAYLOAD_KEY`, and `KRUCIBLE_CUSTOM_OUTPUT_KEY` in `.env`)*

## 🏗️ Architecture Overview

Krucible enforces **Domain-Driven Design**:
1. **Loaders**: `AttackLoader` and `PolicyLoader` parse local YAML into frozen Pydantic Models.
2. **Adapters**: Anti-corruption layers (Strategy Pattern) wrapping external SDKs (`OpenAIAdapter`, `GeminiAdapter`).
3. **Orchestrator**: Dispatches payloads to the Target and routes responses to the `PolicyEngine`.
4. **Regression Engine**: Compares the current `Evaluation` set against the local `BaselineStore`.
5. **Report Engine**: Fans out `ReportSummary` models to standard out (CLI) and disk (JSON).

## 🗺️ Roadmap

- **Phase 2**: Multi-turn Conversation Attacks, LLM-as-a-Judge Policy Evaluators, Ollama Native Integration.
- **Phase 3**: Extensible Plugin ecosystem (`krucible install owasp-top-10`).
- **Phase 4**: Visual HTML Reporting generation.

## 🤝 Contributing

We welcome community contributions! Please review our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
