# Spec: Codex 26.5917.61114 upgrade compatibility

## ADDED Requirements

### Requirement: exact-build fail-closed

The adaptation MUST patch only `openai.chatgpt@26.5917.61114`. Unknown 5917 builds, suffixed versions and future minors MUST produce zero writes.

### Requirement: existing Local Groups behavior remains live

Titles, groups, grouped new conversations, project history, subagent rendering and current Sol/Astra Max/Ultra behavior MUST remain available without changing user configuration. The Max/Ultra model set is `gpt-5.6-sol`, `gpt-6-sol` and `gpt-6-astra`.

### Requirement: split topology is explicit

The implementation MUST locate each semantic bundle uniquely and patch the actual UI/title, power/core and server/history consumers; it MUST NOT select the first matching `app-initial` file.

### Requirement: verification and cleanup are mandatory

Official clean plan/apply, syntax, external verifier, second zero-change plan, runtime regressions and temporary-artifact cleanup MUST pass before reporting completion.
