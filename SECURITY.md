# Security Policy

## Supported Versions

Currently, only the latest release (`v0.1.x`) is supported with security updates.

## Reporting a Vulnerability

If you discover a security vulnerability within Krucible, please do not open a public issue. Instead, send an email to the core maintainers or open a private GitHub security advisory.

We will respond within 48 hours to assess the impact and coordinate a patch.

## Threat Model

Krucible is an AI Security tool. It explicitly handles dangerous, adversarial payloads (e.g., Prompt Injections, Jailbreaks). 
- Payloads are treated as hostile strings.
- Krucible relies on strict Pydantic parsing (`extra="forbid"`) to prevent configuration smuggling.
- Always run Krucible against isolated, non-production AI sandboxes when executing live attacks.
