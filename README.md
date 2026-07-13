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

- **Configuration-Driven**: Zero Python modifications required. Define 10,000+ attacks and policies purely in `.yml` files.
- **Engine Orchestration**: Robust Dependency Injection architecture executing complex multi-stage evaluations securely.
- **Regression Detection**: Tracks policy flips, semantic similarity drifts, and tool-usage deviations.
- **Native Adapters**: Includes production integrations for `OpenAI`, `Gemini`, and a deterministic `Mock` adapter for free, network-less CI testing.
- **CI/CD Ready**: Generates strictly-typed machine-readable JSON artifacts and beautiful Rich terminal outputs with deterministic exit codes.

## 🚀 Quick Start

### Installation

Install Krucible via pip:

```bash
pip install krucible
```

### Initialization

Set up a new Krucible project workspace in your current directory:

```bash
krucible init
```

This generates a `.krucible/` directory structure for your attacks, policies, baselines, and reports.

### Local Mock Execution (No API Key Required)

Test the orchestration pipeline without spending API credits by using the deterministic Mock Adapter:

```bash
krucible test
```

*Output:*
```text
╭─────────────────────────────── AI Security Regression Test Results ────────────────────────────────╮
│ Target: Mock mock-model                                                                            │
│ Duration: 0.00ms                                                                                   │
╰────────────────────────────────────────────────────────────────────────────────────────────────────╯

Attacks Executed: 1
Policies Evaluated: 1

      Execution Results       
┏━━━━━━━━━━━━━━━━━━━┳━━━━━━━━┓
┃ Attack            ┃ Status ┃
┡━━━━━━━━━━━━━━━━━━━╇━━━━━━━━┩
│ Ignore Guardrails │ [PASS] │
└───────────────────┴────────┘

Summary
Passed: 1
Failed: 0
Regressions: 0

Exit Code: 0
```

## ⚙️ Configuration

Your `krucible.yml` controls the orchestrator targeting.

### OpenAI Example
```yaml
version: v1
target:
  adapter: openai
  model: gpt-4o
```
*(Requires `OPENAI_API_KEY` in `.env`)*

### Gemini Example
```yaml
version: v1
target:
  adapter: gemini
  model: gemini-2.0-flash
```
*(Requires `Gemini_API_KEY` in `.env`)*

### Ollama Example (Recommended for Local Dev)
*(Adapter implementation planned for Phase 2)*
```yaml
target:
  adapter: ollama
  model: llama3
```

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
