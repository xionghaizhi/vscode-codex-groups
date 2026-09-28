# Proposal: adapt Codex 26.5917.62051

## Why

Official linux-x64 Codex moved from `26.5917.61114` to `26.5917.62051`. The webview split is unchanged, but the extension host watchdog, metadata injection point and message parser are renamed. Reusing the 61114 host anchors would patch the wrong class and fail closed or leave the UI bridge missing.

This build also declares `extensionDependencies: ["openai.codex-audio"]`. Installing Codex Audio only on the Remote-SSH server leaves it disabled, because its `extensionKind` is `ui`. Codex then fails to activate.

## Scope

- Allow exact build `26.5917.62051` while keeping `26.5917.61114`.
- Select host aliases by exact build. Do not widen unknown 5917 builds.
- Preserve title, group, project history, Max/Ultra and subagent contracts.
- Do not modify Codex configuration or Multi-Agent settings.
- Record the Codex Audio install/enable path for Remote-SSH. Do not treat a remote-only UI install as sufficient.
