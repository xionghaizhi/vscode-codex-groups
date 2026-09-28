# Spec: Codex 26.5917.62051 upgrade compatibility

## MODIFIED Requirements

### Requirement: exact-build fail-closed

The adaptation MUST patch `openai.chatgpt@26.5917.61114` and `openai.chatgpt@26.5917.62051` with their own host aliases. Unknown 5917 builds, suffixed versions and future minors MUST produce zero writes. 62051 MUST NOT be patched with the 61114 host symbols `uD`, `pm`, `xM` or `ute`.

### Requirement: existing Local Groups behavior remains live

Titles, groups, grouped new conversations, project history, subagent rendering and Sol/Astra Max/Ultra behavior MUST remain available without changing user configuration. The Max/Ultra model set remains `gpt-5.6-sol`, `gpt-6-sol` and `gpt-6-astra`.

### Requirement: host drift is explicit

The 62051 host patch MUST bind watchdog `aD`, host class `dm`, startup object `new SM({`, child process alias `oLe`, metadata anchor `Z2e` and capn parser `ate`. Header, UI, Power and Server semantic bundles MUST still be uniquely located.

## ADDED Requirements

### Requirement: Codex Audio dependency is enabled on Remote-SSH

`openai.chatgpt@26.5917.62051` MUST NOT be treated as activated until `openai.codex-audio` is installed and enabled. A remote-only copy of a `extensionKind: ui` Codex Audio MUST be considered disabled. Remote-SSH MAY enable it by installing the matching `26.917.62051` build on the server and setting `remote.extensionKind["openai.codex-audio"] = ["workspace"]`, then reloading. Local Groups MUST NOT modify `~/.codex/config.toml` for this. The marketplace dialog `安装并重新加载` MUST NOT be used as the recorded install path when a server copy already exists.

#### Scenario: missing dependency

- **WHEN** Codex 26.5917.62051 is installed without Codex Audio
- **THEN** VS Code reports that Codex cannot activate because Codex Audio is not installed

#### Scenario: UI-kind copy disabled on remote

- **WHEN** Codex Audio is copied only into `~/.vscode-server/extensions` and `extensionKind` remains `ui`
- **THEN** VS Code reports that Codex cannot activate because Codex Audio is disabled

#### Scenario: remote workspace override

- **WHEN** matching `openai.codex-audio@26.917.62051` is present and `remote.extensionKind` maps it to `workspace`
- **THEN** after Reload Window, Codex can activate without installing a second copy from the dialog
